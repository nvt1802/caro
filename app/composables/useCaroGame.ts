import { ref, computed, watch, onMounted, nextTick } from 'vue'
import {
  type RoomSnapshot,
  type Role,
  type Mark,
  type ClientMessage,
  normalizePlayerName,
  normalizeRoomCode
} from '#shared/caro'

export function useCaroGame() {
  const userName = ref('')
  const roomCodeInput = ref('')
  const snapshot = ref<RoomSnapshot | null>(null)
  const notice = ref('')
  const connectionState = ref<'idle' | 'connecting' | 'connected' | 'closed' | 'error'>('idle')
  const myRole = ref<'host' | 'guest' | null>(null)
  const chatInput = ref('')
  const toasts = ref<{ id: number; text: string }[]>([])
  let toastIdCounter = 0

  let socket: WebSocket | null = null
  let manualClose = false

  const mySeatLabel = computed(() => {
    if (!myRole.value) return 'Đang xem...'
    return myRole.value === 'host' ? 'Host / X' : 'Guest / O'
  })

  const myMark = computed(() => {
    if (myRole.value === 'host') return 'X'
    if (myRole.value === 'guest') return 'O'
    return null
  })
  const scoreboard = computed(() => snapshot.value?.scores ?? { X: 0, O: 0 })
  const timeLeft = computed(() => snapshot.value?.timeLeft ?? 30)
  const chatHistory = computed(() => snapshot.value?.recentChat ?? [])

  const canPlayCell = (row: number, col: number) => {
    if (!snapshot.value || snapshot.value.status !== 'playing' || snapshot.value.winner) {
      return false
    }
    if (!myMark.value || snapshot.value.board[row][col]) {
      return false
    }
    return myMark.value === snapshot.value.turn
  }

  function showToast(text: string) {
    const id = ++toastIdCounter
    toasts.value.push({ id, text })
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, 4000)
  }

  function notifyTurn(newTurn: Mark, roomStatus: string, oldStatus: string | undefined, oldTurn: Mark | undefined) {
    if (roomStatus !== 'playing') return

    const statusJustStarted = oldStatus !== 'playing'
    const turnChanged = oldTurn !== newTurn

    if ((statusJustStarted || turnChanged) && newTurn === myMark.value) {
      showToast('Đến lượt của bạn rồi!')
    }
  }

  const connect = (role: 'host' | 'guest', roomCode: string, name: string) => {
    if (socket) {
      manualClose = true
      socket.close()
    }

    manualClose = false
    myRole.value = role
    userName.value = name
    roomCodeInput.value = roomCode

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws?room=${roomCode}&role=${role}&name=${encodeURIComponent(
      name
    )}`

    connectionState.value = 'connecting'
    socket = new WebSocket(url)

    socket.onopen = () => {
      connectionState.value = 'connected'
      notice.value = ''
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('room') !== roomCode) {
        window.history.replaceState({}, '', `?room=${roomCode}`)
      }
    }

    socket.onmessage = (event) => {
      let payload: any
      try {
        payload = JSON.parse(event.data)
      } catch (err) {
        return
      }

      if (payload.type === 'error') {
        notice.value = payload.message
        return
      }

      if (payload.type === 'snapshot') {
        const oldTurn = snapshot.value?.turn
        const oldStatus = snapshot.value?.status
        snapshot.value = payload.room
        notifyTurn(snapshot.value!.turn, snapshot.value!.status, oldStatus, oldTurn)
      }
    }

    socket.onclose = () => {
      if (!manualClose) {
        connectionState.value = 'closed'
        notice.value = 'Mất kết nối với máy chủ.'
      }
    }

    socket.onerror = () => {
      connectionState.value = 'error'
      notice.value = 'Lỗi kết nối WebSocket.'
    }
  }

  const createRoom = () => {
    if (!userName.value.trim()) {
      notice.value = 'Vui lòng nhập tên của bạn.'
      return
    }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    connect('host', code, userName.value)
  }

  const joinRoom = () => {
    if (!userName.value.trim()) {
      notice.value = 'Vui lòng nhập tên của bạn.'
      return
    }
    if (roomCodeInput.value.length < 6) {
      notice.value = 'Mã phòng không hợp lệ.'
      return
    }
    connect('guest', roomCodeInput.value, userName.value)
  }

  const playCell = (row: number, col: number) => {
    if (!canPlayCell(row, col) || !socket || socket.readyState !== WebSocket.OPEN) {
      return
    }
    socket.send(JSON.stringify({ type: 'move', row, col }))
  }

  const toggleReady = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify({ type: 'ready' }))
  }

  const startGame = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify({ type: 'start' }))
  }

  const restartMatch = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify({ type: 'restart' }))
  }

  const sendChatMessage = () => {
    if (!chatInput.value.trim() || !socket || socket.readyState !== WebSocket.OPEN) {
      return
    }
    socket.send(JSON.stringify({ type: 'chat', text: chatInput.value }))
    chatInput.value = ''
  }

  onMounted(() => {
    userName.value = window.localStorage.getItem('caro-user-name') ?? ''
    const savedRoom = window.sessionStorage.getItem('caro-room-code') ?? ''
    const savedRole = window.sessionStorage.getItem('caro-room-role') as Role | null

    const urlParams = new URLSearchParams(window.location.search)
    const roomFromUrl = normalizeRoomCode(urlParams.get('room') ?? '')

    if (roomFromUrl) {
      roomCodeInput.value = roomFromUrl
      if (roomFromUrl === savedRoom && savedRole && userName.value) {
        connect(savedRole, roomFromUrl, userName.value)
      }
    }
  })

  watch(userName, (val) => window.localStorage.setItem('caro-user-name', val))
  watch(roomCodeInput, (val) => {
    roomCodeInput.value = normalizeRoomCode(val)
    window.sessionStorage.setItem('caro-room-code', roomCodeInput.value)
  })
  watch(myRole, (val) => {
    if (val) window.sessionStorage.setItem('caro-room-role', val)
  })

  return {
    userName,
    roomCodeInput,
    snapshot,
    notice,
    connectionState,
    myRole,
    mySeatLabel,
    myMark,
    scoreboard,
    timeLeft,
    chatHistory,
    chatInput,
    toasts,
    createRoom,
    joinRoom,
    toggleReady,
    startGame,
    playCell,
    restartMatch,
    sendChatMessage,
    canPlayCell
  }
}
