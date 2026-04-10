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
  type ChatMessage,
} from "#shared/caro";

// No more local rooms Map or lobbyPeers Set.
// State management is now handled by the server API routes calling Supabase.

/**
 * Data structure used for the database row.
 */
export interface RoomRow {
  id: string;
  code: string;
  name: string;
  password?: string;
  host_name: string;
  guest_name: string;
  host_connected: boolean;
  guest_connected: boolean;
  host_ready: boolean;
  guest_ready: boolean;
  status: GameStatus;
  board: Cell[][];
  turn: Mark;
  winner: Mark | "draw" | null;
  winning_line: Array<[number, number]>;
  scores: Record<Mark, number>;
  recent_chat: ChatMessage[];
  time_left: number;
  updated_at: string;
  is_ai: boolean;
}

/**
 * Creates a new room row object (initial state).
 */
export function createNewRoomRow(
  code: string,
  hostName: string,
  roomName?: string,
  password?: string,
  isAi?: boolean,
): Partial<RoomRow> {
  const normalizedCode = normalizeRoomCode(code);
  const snapshot = createInitialSnapshot(normalizedCode);

  return {
    code: normalizedCode,
    name: roomName || "Phòng Caro",
    password: password || undefined,
    host_name: normalizePlayerName(hostName),
    guest_name: isAi ? "Máy (BOT)" : "Guest",
    host_connected: true,
    guest_connected: isAi,
    host_ready: false,
    guest_ready: isAi,
    status: "waiting",
    board: snapshot.board,
    turn: snapshot.turn,
    winner: snapshot.winner,
    winning_line: snapshot.winningLine,
    scores: snapshot.scores,
    recent_chat: [],
    time_left: TURN_TIME_LIMIT,
    is_ai: isAi ?? false,
  };
}

/**
 * Validates a move and returns the updated state fields.
 */
export function processMove(
  row: RoomRow,
  role: Role,
  r: number,
  c: number,
): Partial<RoomRow> | string {
  const mark: Mark = role === "host" ? "X" : "O";

  if (row.status !== "playing" || row.winner) {
    return "Ván đấu chưa bắt đầu hoặc đã kết thúc.";
  }

  if (row.turn !== mark) {
    return `Chưa tới lượt ${mark}.`;
  }

  if (!Number.isInteger(r) || !Number.isInteger(c)) {
    return "Tọa độ nước đi không hợp lệ.";
  }

  if (r < 0 || c < 0 || r >= row.board.length || c >= row.board[r]!.length) {
    return "Ô đó nằm ngoài bàn cờ.";
  }

  if (row.board[r]![c]) {
    return "Ô này đã được chọn.";
  }

  const newBoard = cloneBoard(row.board);
  newBoard[r]![c] = mark;

  const winningLine = createWinningLine(newBoard, r, c, mark) ?? [];
  let status: GameStatus = row.status;
  let winner: Mark | "draw" | null = row.winner;
  const scores = { ...row.scores };
  let turn = row.turn;

  if (winningLine.length >= 5) {
    winner = mark;
    status = "finished";
    scores[mark] += 1;
  } else if (newBoard.every((line) => line.every((cell) => cell))) {
    winner = "draw";
    status = "finished";
  } else {
    turn = mark === "X" ? "O" : "X";
  }

  return {
    board: newBoard,
    status,
    winner,
    winning_line: winningLine,
    scores,
    turn,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Heuristic scoring for AI to find the best move.
 */
function evaluateMove(board: Cell[][], r: number, c: number, mark: Mark): number {
  const opponentMark: Mark = mark === "X" ? "O" : "X";
  let totalScore = 0;

  const directions = [
    [1, 0], [0, 1], [1, 1], [1, -1]
  ];

  for (const [dr, dc] of directions) {
    const aiPatterns = checkLinePatterns(board, r, c, dr, dc, mark);
    const opPatterns = checkLinePatterns(board, r, c, dr, dc, opponentMark);

    // Defensive is slightly higher priority than offensive unless AI can win
    if (aiPatterns.count >= 5) totalScore += 100000;
    else if (opPatterns.count >= 5) totalScore += 50000;
    else if (aiPatterns.count === 4 && aiPatterns.openSides > 0) totalScore += 10000;
    else if (opPatterns.count === 4 && opPatterns.openSides > 0) totalScore += 8000;
    else if (aiPatterns.count === 3 && aiPatterns.openSides === 2) totalScore += 3000;
    else if (opPatterns.count === 3 && opPatterns.openSides === 2) totalScore += 2000;
    else totalScore += aiPatterns.count * 10 + opPatterns.count * 5;
  }

  return totalScore;
}

function checkLinePatterns(board: Cell[][], r: number, c: number, dr: number, dc: number, mark: Mark) {
  let count = 1;
  let openSides = 0;

  // Check forward
  for (let i = 1; i < 5; i++) {
    const nr = r + dr * i, nc = c + dc * i;
    if (nr < 0 || nr >= board.length || nc < 0 || nc >= board[0]!.length) break;
    if (board[nr]![nc] === mark) count++;
    else {
      if (!board[nr]![nc]) openSides++;
      break;
    }
  }
  // Check backward
  for (let i = 1; i < 5; i++) {
    const nr = r - dr * i, nc = c - dc * i;
    if (nr < 0 || nr >= board.length || nc < 0 || nc >= board[0]!.length) break;
    if (board[nr]![nc] === mark) count++;
    else {
      if (!board[nr]![nc]) openSides++;
      break;
    }
  }

  return { count, openSides };
}

export function calculateAIMove(board: Cell[][], aiMark: Mark): { r: number, c: number } | null {
  let bestScore = -1;
  let bestMoves: { r: number, c: number }[] = [];

  // Scopes the search area to cells near existing marks to improve performance
  const searchArea: { r: number, c: number }[] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r]!.length; c++) {
      if (board[r]![c]) continue;
      
      let hasNeighbor = false;
      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          const nr = r + i, nc = c + j;
          if (nr >= 0 && nr < board.length && nc >= 0 && nc < (board[nr]?.length || 0) && board[nr]![nc]) {
            hasNeighbor = true;
            break;
          }
        }
        if (hasNeighbor) break;
      }

      if (hasNeighbor || (r === 10 && c === 10)) { // Center if empty
        searchArea.push({ r, c });
      }
    }
  }

  for (const { r, c } of searchArea) {
    const score = evaluateMove(board, r, c, aiMark);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [{ r, c }];
    } else if (score === bestScore) {
      bestMoves.push({ r, c });
    }
  }

  if (bestMoves.length === 0) return null;
  return bestMoves[Math.floor(Math.random() * bestMoves.length)]!;
}

/**
 * Processes a chat message.
 */
export function processChat(
  row: RoomRow,
  role: Role,
  text: string,
): Partial<RoomRow> {
  const name = role === "host" ? row.host_name : row.guest_name;
  const msg: ChatMessage = {
    sender: role,
    name,
    text,
    time: new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  const recent_chat = [...row.recent_chat, msg];
  if (recent_chat.length > 50) {
    recent_chat.shift();
  }

  return {
    recent_chat,
    updated_at: new Date().toISOString(),
  };
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
      {
        role: "host",
        name: row.host_name,
        connected: row.host_connected,
        ready: row.host_ready,
      },
      {
        role: "guest",
        name: row.guest_name,
        connected: row.guest_connected,
        ready: row.guest_ready,
      },
    ],
    scores: row.scores,
    recentChat: row.recent_chat,
    timeLeft: row.time_left,
    updatedAt: row.updated_at,
    name: row.name,
    isAi: row.is_ai,
  };
}

/**
 * Converts a DB row to a RoomListItem for the lobby.
 */
export function rowToListItem(row: RoomRow): RoomListItem {
  const connectedCount =
    (row.host_connected ? 1 : 0) + (row.guest_connected ? 1 : 0);
  return {
    code: row.code,
    hostName: row.host_name,
    guestName: row.guest_name,
    connectedCount,
    status: row.status,
    updatedAt: row.updated_at,
    canJoin: connectedCount < 2,
    name: row.name,
    isPrivate: !!row.password,
    isAi: row.is_ai,
  };
}
