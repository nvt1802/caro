export const BOARD_SIZE = 15
export const WIN_LENGTH = 5
export const ROOM_CODE_LENGTH = 6
export const TURN_TIME_LIMIT = 30 // seconds

export type Mark = 'X' | 'O'
export type Cell = Mark | null
export type GameStatus = 'waiting' | 'playing' | 'finished'
export type Role = 'host' | 'guest'

export interface SnapshotPlayer {
  role: Role
  name: string
  connected: boolean
  ready: boolean
}

export interface ChatMessage {
  sender: Role
  name: string
  text: string
  time: string
}

export interface MoveState {
  row: number
  col: number
  mark: Mark
}

export interface RoomSnapshot {
  code: string
  board: Cell[][]
  turn: Mark
  winner: Mark | 'draw' | null
  status: GameStatus
  winningLine: Array<[number, number]>
  lastMove: MoveState | null
  players: SnapshotPlayer[]
  scores: Record<Mark, number>
  recentChat: ChatMessage[]
  timeLeft: number
  updatedAt: string
  name: string
}

export interface RoomListItem {
  code: string
  hostName: string
  guestName: string
  connectedCount: number
  status: GameStatus
  updatedAt: string
  canJoin: boolean
  name: string
  isPrivate: boolean
}

export interface ClientMoveMessage {
  type: 'move'
  row: number
  col: number
}

export interface ClientRestartMessage {
  type: 'restart'
}

export interface ClientChatValue {
  type: 'chat'
  text: string
}

export interface ClientReadyMessage {
  type: 'ready'
}

export interface ClientStartMessage {
  type: 'start'
}

export type ClientMessage =
  | ClientMoveMessage
  | ClientRestartMessage
  | ClientChatValue
  | ClientReadyMessage
  | ClientStartMessage

export interface ServerSnapshotMessage {
  type: 'snapshot'
  room: RoomSnapshot
}

export interface ServerErrorMessage {
  type: 'error'
  message: string
}

export type ServerMessage = ServerSnapshotMessage | ServerErrorMessage

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function normalizeRoomCode(code: string) {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH)
}

export function normalizePlayerName(name: string) {
  const cleaned = name.trim().replace(/\s+/g, ' ').slice(0, 24)
  return cleaned || 'Người chơi'
}

export function createRoomCode() {
  const buffer = new Uint32Array(ROOM_CODE_LENGTH)
  globalThis.crypto.getRandomValues(buffer)

  return Array.from(buffer, value => CODE_ALPHABET[value % CODE_ALPHABET.length]).join('')
}

export function createEmptyBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => null as Cell))
}

export function cloneBoard(board: Cell[][]) {
  return board.map(row => [...row])
}

export function createInitialSnapshot(code: string): RoomSnapshot {
  return {
    code,
    board: createEmptyBoard(),
    turn: 'X',
    winner: null,
    status: 'waiting',
    winningLine: [],
    lastMove: null,
    players: [
      { role: 'host', name: 'Host', connected: false, ready: false },
      { role: 'guest', name: 'Guest', connected: false, ready: false }
    ],
    scores: { X: 0, O: 0 },
    recentChat: [],
    timeLeft: TURN_TIME_LIMIT,
    updatedAt: new Date().toISOString(),
    name: 'Phòng Caro'
  }
}

export function isMoveMessage(value: unknown): value is ClientMoveMessage {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as ClientMoveMessage).type === 'move' &&
      typeof (value as ClientMoveMessage).row === 'number' &&
      typeof (value as ClientMoveMessage).col === 'number'
  )
}

export function isRestartMessage(value: unknown): value is ClientRestartMessage {
  return Boolean(value && typeof value === 'object' && (value as ClientRestartMessage).type === 'restart')
}

export function isChatMessage(value: unknown): value is ClientChatValue {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as ClientChatValue).type === 'chat' &&
      typeof (value as ClientChatValue).text === 'string'
  )
}

export function isReadyMessage(value: unknown): value is ClientReadyMessage {
  return Boolean(value && typeof value === 'object' && (value as ClientReadyMessage).type === 'ready')
}

export function isStartMessage(value: unknown): value is ClientStartMessage {
  return Boolean(value && typeof value === 'object' && (value as ClientStartMessage).type === 'start')
}

export function isClientMessage(value: unknown): value is ClientMessage {
  return (
    isMoveMessage(value) ||
    isRestartMessage(value) ||
    isChatMessage(value) ||
    isReadyMessage(value) ||
    isStartMessage(value)
  )
}

export function createWinningLine(board: Cell[][], row: number, col: number, mark: Mark) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1]
  ] as const

  for (const [dr, dc] of directions) {
    const line: Array<[number, number]> = [[row, col]]

    let r = row + dr
    let c = col + dc
    while (isInBounds(r, c) && board[r]![c] === mark) {
      line.push([r, c])
      r += dr
      c += dc
    }

    r = row - dr
    c = col - dc
    while (isInBounds(r, c) && board[r]![c] === mark) {
      line.unshift([r, c])
      r -= dr
      c -= dc
    }

    if (line.length >= WIN_LENGTH) {
      return line
    }
  }

  return null
}

export function isInBounds(row: number, col: number) {
  return row >= 0 && col >= 0 && row < BOARD_SIZE && col < BOARD_SIZE
}
