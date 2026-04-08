import {
  applyMove,
  attachPeer,
  detachPeer,
  findRoomByPeer,
  getOrCreateHostRoom,
  getRoomForGuest,
  getPeerRole,
  resetRoom,
  addChatMessage,
  sendError,
  sendSnapshot,
  toggleReady,
  startGame
} from '../utils/caro'
import { isClientMessage, normalizePlayerName, normalizeRoomCode } from '#shared/caro'

export default defineWebSocketHandler({
  open(peer) {
    const requestUrl = new URL(peer.request.url)
    const roomCode = normalizeRoomCode(requestUrl.searchParams.get('room') ?? '')
    const role = requestUrl.searchParams.get('role') === 'host' ? 'host' : 'guest'
    const name = normalizePlayerName(requestUrl.searchParams.get('name') ?? '')

    if (!roomCode) {
      sendError(peer, 'Thiếu mã phòng.')
      peer.close()
      return
    }

    const room = role === 'host' ? getOrCreateHostRoom(roomCode) : getRoomForGuest(roomCode)
    if (!room) {
      sendError(peer, 'Phòng chưa được tạo. Chủ phòng cần mở trước.')
      peer.close()
      return
    }

    if (!attachPeer(room, role, peer, name)) {
      sendError(peer, role === 'host' ? 'Phòng đã có chủ đang kết nối.' : 'Phòng đã đủ 2 người chơi.')
      peer.close()
      return
    }

    sendSnapshot(room)
  },
  message(peer, message) {
    const text = typeof message === 'string' ? message : message.toString()

    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      sendError(peer, 'Dữ liệu điều khiển không hợp lệ.')
      return
    }

    if (!isClientMessage(parsed)) {
      sendError(peer, 'Dữ liệu điều khiển không hợp lệ.')
      return
    }

    const room = findRoomByPeer(peer)
    if (!room) {
      sendError(peer, 'Không tìm thấy phòng đang kết nối.')
      return
    }

    const role = getPeerRole(room, peer)
    if (!role) {
      sendError(peer, 'Bạn chưa được gán vào phòng này.')
      return
    }

    if (parsed.type === 'move') {
      const error = applyMove(room, role, parsed.row, parsed.col)
      if (error) {
        sendError(peer, error)
        return
      }

      sendSnapshot(room)
      return
    }

    if (parsed.type === 'chat') {
      addChatMessage(room, role, parsed.text)
      return
    }

    if (parsed.type === 'ready') {
      toggleReady(room, role)
      return
    }

    if (parsed.type === 'start') {
      if (role !== 'host') {
        sendError(peer, 'Chỉ chủ phòng mới có thể bắt đầu ván đấu.')
        return
      }
      startGame(room)
      return
    }

    if (role !== 'host') {
      sendError(peer, 'Chỉ chủ phòng mới có thể tạo ván mới.')
      return
    }

    resetRoom(room)
    sendSnapshot(room)
  },
  close(peer) {
    const room = findRoomByPeer(peer)
    if (!room) {
      return
    }

    detachPeer(room, peer)
    sendSnapshot(room)
  }
})
