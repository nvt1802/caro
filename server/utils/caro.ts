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

type RoomPeer = {
  id: string
  send: (payload: string) => void
  ready?: boolean
}

type AssignedPlayer = {
  name: string
  peer: RoomPeer | null
}

type RoomState = {
  code: string
  hostCreated: boolean
  createdAt: number
  updatedAt: number
  host: AssignedPlayer
  guest: AssignedPlayer
  board: Cell[][]
  turn: Mark
  winner: Mark | 'draw' | null
  status: GameStatus
  winningLine: Array<[number, number]>
  lastMove: MoveState | null
  scores: Record<Mark, number>
  recentChat: ChatMessage[]
  timeLeft: number
  timerId?: any
}

declare global {
  // eslint-disable-next-line no-var
  var __testOmxCaroRooms: Map<string, RoomState> | undefined
}

const rooms = globalThis.__testOmxCaroRooms ?? new Map<string, RoomState>()

globalThis.__testOmxCaroRooms = rooms

const lobbyPeers = new Set<RoomPeer>()

export function addToLobby(peer: RoomPeer) {
  lobbyPeers.add(peer)
  // Immediate update for the new lobby peer
  peer.send(JSON.stringify({ type: 'room-list', rooms: listRoomItems() }))
}

export function removeFromLobby(peer: RoomPeer) {
  lobbyPeers.delete(peer)
}

export function broadcastRoomList() {
  const payload = JSON.stringify({ type: 'room-list', rooms: listRoomItems() })
  for (const peer of lobbyPeers) {
    try {
      peer.send(payload)
    } catch {
      lobbyPeers.delete(peer)
    }
  }
}

export function getRoom(code: string) {
  return rooms.get(normalizeRoomCode(code)) ?? null
}

export function getOrCreateHostRoom(code: string) {
  const normalizedCode = normalizeRoomCode(code)
  const existing = rooms.get(normalizedCode)
  if (existing) {
    existing.hostCreated = true
    existing.updatedAt = Date.now()
    return existing
  }

  const snapshot = createInitialSnapshot(normalizedCode)
  const room: RoomState = {
    code: snapshot.code,
    hostCreated: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    host: { name: 'Host', peer: null },
    guest: { name: 'Guest', peer: null },
    board: snapshot.board,
    turn: snapshot.turn,
    winner: snapshot.winner,
    status: snapshot.status,
    winningLine: snapshot.winningLine,
    lastMove: snapshot.lastMove,
    scores: { X: 0, O: 0 },
    recentChat: [],
    timeLeft: TURN_TIME_LIMIT
  }

  rooms.set(normalizedCode, room)
  broadcastRoomList()
  return room
}

export function getRoomForGuest(code: string) {
  const room = getRoom(code)
  if (!room || !room.hostCreated) {
    return null
  }

  return room
}

export function findRoomByPeer(peer: RoomPeer) {
  for (const room of rooms.values()) {
    if (room.host.peer?.id === peer.id || room.guest.peer?.id === peer.id) {
      return room
    }
  }

  return null
}

export function attachPeer(room: RoomState, role: Role, peer: RoomPeer, name: string) {
  const slot = role === 'host' ? room.host : room.guest
  if (slot.peer && slot.peer.id !== peer.id) {
    return false
  }

  slot.name = normalizePlayerName(name)
  slot.peer = peer
  slot.peer.ready = false
  room.updatedAt = Date.now()
  syncRoomState(room)
  if (room.status === 'playing' && !room.timerId) {
    startTurnTimer(room)
  }
  broadcastRoomList()
  return true
}

export function detachPeer(room: RoomState, peer: RoomPeer) {
  const isHost = room.host.peer?.id === peer.id
  if (isHost) {
    room.host.peer = null
  }

  if (room.guest.peer?.id === peer.id) {
    room.guest.peer = null
  }

  room.updatedAt = Date.now()

  if (isHost) {
    if (room.guest.peer) {
      sendError(room.guest.peer, 'Chủ phòng đã rời đi, phòng bị giải tán.')
      // No need to close explicitly here, the client will handle it or wait for close.
      // But clearing snapshot on client is important.
    }
    if (room.timerId) {
      clearInterval(room.timerId)
      room.timerId = null
    }
    rooms.delete(room.code)
  } else {
    syncRoomState(room)
  }
  broadcastRoomList()
}

export function getPeerRole(room: RoomState, peer: RoomPeer): Role | null {
  if (room.host.peer?.id === peer.id) {
    return 'host'
  }

  if (room.guest.peer?.id === peer.id) {
    return 'guest'
  }

  return null
}

export function resetRoom(room: RoomState) {
  room.board = createEmptyBoard()
  room.turn = 'X'
  room.winner = null
  room.status = 'waiting'
  room.winningLine = []
  room.lastMove = null
  room.timeLeft = TURN_TIME_LIMIT
  room.updatedAt = Date.now()
  if (room.host.peer) room.host.peer.ready = false
  if (room.guest.peer) room.guest.peer.ready = false
  syncRoomState(room)
  broadcastRoomList()
  startTurnTimer(room)
}

export function toggleReady(room: RoomState, role: Role) {
  const player = role === 'host' ? room.host : room.guest
  if (!player.peer) return
  player.peer.ready = !player.peer.ready
  sendSnapshot(room)
}

export function startGame(room: RoomState) {
  if (room.status !== 'waiting') return
  if (!room.host.peer || !room.guest.peer) return
  if (!room.guest.peer.ready) return

  room.status = 'playing'
  room.board = createEmptyBoard()
  room.winner = null
  room.winningLine = []
  room.lastMove = null
  room.turn = Math.random() < 0.5 ? 'X' : 'O'
  room.timeLeft = TURN_TIME_LIMIT
  room.updatedAt = Date.now()

  sendSnapshot(room)
  broadcastRoomList()
  startTurnTimer(room)
}

export function addChatMessage(room: RoomState, role: Role, text: string) {
  const name = role === 'host' ? room.host.name : room.guest.name
  const msg: ChatMessage = {
    sender: role,
    name,
    text,
    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }
  room.recentChat.push(msg)
  if (room.recentChat.length > 50) {
    room.recentChat.shift()
  }
  sendSnapshot(room)
}

function startTurnTimer(room: RoomState) {
  if (room.timerId) {
    clearInterval(room.timerId)
    room.timerId = null
  }

  if (room.status !== 'playing') {
    return
  }

  room.timeLeft = TURN_TIME_LIMIT
  room.timerId = setInterval(() => {
    if (room.status !== 'playing' || connectedPlayerCount(room) < 2) {
      clearInterval(room.timerId)
      return
    }

    room.timeLeft -= 1
    if (room.timeLeft <= 0) {
      // Hết giờ: Xử lý thua cuộc hoặc đổi lượt. 
      // Ở đây ta đơn giản là đổi lượt nếu chưa đi, hoặc tính thua.
      // Để game "gắt" hơn, ta tính người hiện tại THUA.
      room.winner = room.turn === 'X' ? 'O' : 'X'
      room.status = 'finished'
      room.scores[room.winner] += 1
      clearInterval(room.timerId)
      sendSnapshot(room)
    } else {
      // Gửi snapshot mỗi giây có vẻ hơi nặng, nhưng để timer mượt thì cần.
      // Hoặc chỉ gửi khi timeLeft thay đổi đáng kể. Hãy gửi mỗi giây cho realtime.
      sendSnapshot(room)
    }
  }, 1000)
}

export function applyMove(room: RoomState, role: Role, row: number, col: number) {
  const mark = role === 'host' ? 'X' : 'O'

  if (room.status !== 'playing' || room.winner) {
    return 'Ván đấu chưa bắt đầu hoặc đã kết thúc.'
  }

  if (room.turn !== mark) {
    return `Chưa tới lượt ${mark}.`
  }

  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    return 'Tọa độ nước đi không hợp lệ.'
  }

  if (row < 0 || col < 0 || row >= room.board.length || col >= room.board[row]!.length) {
    return 'Ô đó nằm ngoài bàn cờ.'
  }

  if (room.board[row]![col]) {
    return 'Ô này đã được chọn.'
  }

  room.board[row]![col] = mark
  room.lastMove = { row, col, mark }
  room.winningLine = createWinningLine(room.board, row, col, mark) ?? []

  if (room.winningLine.length >= 5) {
    room.winner = mark
    room.status = 'finished'
    room.scores[mark] += 1
    if (room.timerId) clearInterval(room.timerId)
  } else if (room.board.every(line => line.every(cell => cell))) {
    room.winner = 'draw'
    room.status = 'finished'
    if (room.timerId) {
      clearInterval(room.timerId)
      room.timerId = null
    }
  } else {
    room.turn = mark === 'X' ? 'O' : 'X'
    if (connectedPlayerCount(room) < 2) {
      room.status = 'waiting'
    } else {
      startTurnTimer(room)
    }
  }

  room.updatedAt = Date.now()
  broadcastRoomList()
  return null
}

export function snapshotRoom(room: RoomState): RoomSnapshot {
  return {
    code: room.code,
    board: cloneBoard(room.board),
    turn: room.turn,
    winner: room.winner,
    status: room.status,
    winningLine: [...room.winningLine],
    lastMove: room.lastMove ? { ...room.lastMove } : null,
    players: [
      { role: 'host', name: room.host.name, connected: Boolean(room.host.peer), ready: Boolean(room.host.peer?.ready) },
      { role: 'guest', name: room.guest.name, connected: Boolean(room.guest.peer), ready: Boolean(room.guest.peer?.ready) }
    ],
    scores: { ...room.scores },
    recentChat: [...room.recentChat],
    timeLeft: room.timeLeft,
    updatedAt: new Date(room.updatedAt).toISOString()
  }
}

export function listRoomItems(): RoomListItem[] {
  return [...rooms.values()]
    .map((room) => {
      const connectedCount = connectedPlayerCount(room)

      return {
        code: room.code,
        hostName: room.host.name,
        guestName: room.guest.name,
        connectedCount,
        status: room.status,
        updatedAt: new Date(room.updatedAt).toISOString(),
        canJoin: connectedCount < 2
      }
    })
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
}

export function sendSnapshot(room: RoomState) {
  const payload = JSON.stringify({ type: 'snapshot', room: snapshotRoom(room) })
  for (const peer of [room.host.peer, room.guest.peer]) {
    peer?.send(payload)
  }
}

export function sendError(peer: RoomPeer, message: string) {
  peer.send(JSON.stringify({ type: 'error', message }))
}

function syncRoomState(room: RoomState) {
  if (room.winner) {
    room.status = 'finished'
    return
  }

  const count = connectedPlayerCount(room)
  if (count < 2) {
    room.status = 'waiting'
    if (room.host.peer) room.host.peer.ready = false
    if (room.guest.peer) room.guest.peer.ready = false
    return
  }

  if (room.status !== 'playing') {
    room.status = 'waiting'
  }
}

function connectedPlayerCount(room: RoomState) {
  return Number(Boolean(room.host.peer)) + Number(Boolean(room.guest.peer))
}
