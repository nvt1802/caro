import {
  type Cell,
  type GameStatus,
  type Mark,
  type MoveState,
  type RoomListItem,
  type Role,
  type RoomSnapshot,
  cloneBoard,
  createEmptyBoard,
  createInitialSnapshot,
  createWinningLine,
  normalizePlayerName,
  normalizeRoomCode,
  TURN_TIME_LIMIT,
  type ChatMessage
} from '#shared/caro'

// No more local rooms Map or lobbyPeers Set.
// State management is now handled by the server API routes calling Supabase.

/**
 * Data structure used for the database row.
 */
export interface RoomRow {
  id: string
  code: string
  host_name: string
  guest_name: string
  host_connected: boolean
  guest_connected: boolean
  host_ready: boolean
  guest_ready: boolean
  status: GameStatus
  board: Cell[][]
  turn: Mark
  winner: Mark | 'draw' | null
  winning_line: Array<[number, number]>
  scores: Record<Mark, number>
  recent_chat: ChatMessage[]
  time_left: number
  updated_at: string
}

/**
 * Creates a new room row object (initial state).
 */
export function createNewRoomRow(code: string, hostName: string): Partial<RoomRow> {
  const normalizedCode = normalizeRoomCode(code)
  const snapshot = createInitialSnapshot(normalizedCode)
  
  return {
    code: normalizedCode,
    host_name: normalizePlayerName(hostName),
    guest_name: 'Guest',
    host_connected: true,
    guest_connected: false,
    host_ready: false,
    guest_ready: false,
    status: 'waiting',
    board: snapshot.board,
    turn: snapshot.turn,
    winner: snapshot.winner,
    winning_line: snapshot.winningLine,
    scores: snapshot.scores,
    recent_chat: [],
    time_left: TURN_TIME_LIMIT
  }
}

/**
 * Validates a move and returns the updated state fields.
 */
export function processMove(row: RoomRow, role: Role, r: number, c: number): Partial<RoomRow> | string {
  const mark: Mark = role === 'host' ? 'X' : 'O'

  if (row.status !== 'playing' || row.winner) {
    return 'Ván đấu chưa bắt đầu hoặc đã kết thúc.'
  }

  if (row.turn !== mark) {
    return `Chưa tới lượt ${mark}.`
  }

  if (!Number.isInteger(r) || !Number.isInteger(c)) {
    return 'Tọa độ nước đi không hợp lệ.'
  }

  if (r < 0 || c < 0 || r >= row.board.length || c >= row.board[r]!.length) {
    return 'Ô đó nằm ngoài bàn cờ.'
  }

  if (row.board[r]![c]) {
    return 'Ô này đã được chọn.'
  }

  const newBoard = cloneBoard(row.board)
  newBoard[r]![c] = mark
  
  const winningLine = createWinningLine(newBoard, r, c, mark) ?? []
  let status = row.status
  let winner = row.winner
  const scores = { ...row.scores }
  let turn = row.turn

  if (winningLine.length >= 5) {
    winner = mark
    status = 'finished'
    scores[mark] += 1
  } else if (newBoard.every(line => line.every(cell => cell))) {
    winner = 'draw'
    status = 'finished'
  } else {
    turn = mark === 'X' ? 'O' : 'X'
  }

  return {
    board: newBoard,
    status,
    winner,
    winning_line: winningLine,
    scores,
    turn,
    updated_at: new Date().toISOString()
  }
}

/**
 * Processes a chat message.
 */
export function processChat(row: RoomRow, role: Role, text: string): Partial<RoomRow> {
  const name = role === 'host' ? row.host_name : row.guest_name
  const msg: ChatMessage = {
    sender: role,
    name,
    text,
    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }
  
  const recent_chat = [...row.recent_chat, msg]
  if (recent_chat.length > 50) {
    recent_chat.shift()
  }

  return {
    recent_chat,
    updated_at: new Date().toISOString()
  }
}

/**
 * Converts a DB row to a RoomSnapshot for the client.
 */
export function rowToSnapshot(row: RoomRow): RoomSnapshot {
  return {
    code: row.code,
    board: row.board,
    turn: row.turn,
    winner: row.winner,
    status: row.status,
    winningLine: row.winning_line,
    lastMove: null, // We could derive this if needed
    players: [
      { role: 'host', name: row.host_name, connected: row.host_connected, ready: row.host_ready },
      { role: 'guest', name: row.guest_name, connected: row.guest_connected, ready: row.guest_ready }
    ],
    scores: row.scores,
    recentChat: row.recent_chat,
    timeLeft: row.time_left,
    updatedAt: row.updated_at
  }
}

/**
 * Converts a DB row to a RoomListItem for the lobby.
 */
export function rowToListItem(row: RoomRow): RoomListItem {
  const connectedCount = (row.host_connected ? 1 : 0) + (row.guest_connected ? 1 : 0)
  return {
    code: row.code,
    hostName: row.host_name,
    guestName: row.guest_name,
    connectedCount,
    status: row.status,
    updatedAt: row.updated_at,
    canJoin: connectedCount < 2
  }
}
