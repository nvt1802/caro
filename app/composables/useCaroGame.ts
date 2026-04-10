import { ref, computed, watch, onMounted } from "vue";
import {
  type RoomSnapshot,
  type RoomListItem,
  type Role,
  type Mark,
  normalizePlayerName,
  normalizeRoomCode,
} from "#shared/caro";

export function useCaroGame() {
  const supabase = useSupabaseClient();
  const userName = ref("");
  const roomCodeInput = ref("");
  const snapshot = ref<RoomSnapshot | null>(null);
  const roomList = ref<RoomListItem[]>([]);
  const notice = ref("");
  const connectionState = ref<
    "idle" | "connecting" | "connected" | "closed" | "error"
  >("idle");
  const myRole = ref<"host" | "guest" | null>(null);
  const chatInput = ref("");
  const toasts = ref<{ id: number; text: string }[]>([]);
  const isLoading = ref(false);
  const loadingCell = ref<{ row: number; col: number } | null>(null);
  let toastIdCounter = 0;

  let roomChannel: any = null;
  let lobbyChannel: any = null;

  const mySeatLabel = computed(() => {
    if (!myRole.value) return "Đang xem...";
    return myRole.value === "host" ? "Host / X" : "Guest / O";
  });

  const myMark = computed(() => {
    if (myRole.value === "host") return "X";
    if (myRole.value === "guest") return "O";
    return null;
  });
  const scoreboard = computed(() => snapshot.value?.scores ?? { X: 0, O: 0 });
  const timeLeft = computed(() => snapshot.value?.timeLeft ?? 30);
  const chatHistory = computed(() => snapshot.value?.recentChat ?? []);

  const canPlayCell = (row: number, col: number) => {
    if (
      !snapshot.value ||
      snapshot.value.status !== "playing" ||
      snapshot.value.winner
    ) {
      return false;
    }
    const board = snapshot.value.board;
    if (!myMark.value || !board || !board[row] || board[row][col]) {
      return false;
    }
    return myMark.value === snapshot.value.turn;
  };

  function showToast(text: string) {
    const id = ++toastIdCounter;
    toasts.value.push({ id, text });
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, 4000);
  }

  function notifyTurn(
    newTurn: Mark,
    roomStatus: string,
    oldStatus: string | undefined,
    oldTurn: Mark | undefined,
  ) {
    if (roomStatus !== "playing") return;

    const statusJustStarted = oldStatus !== "playing";
    const turnChanged = oldTurn !== newTurn;

    if ((statusJustStarted || turnChanged) && newTurn === myMark.value) {
      showToast("Đến lượt của bạn rồi!");
    }
  }

  const unsubscribeAll = () => {
    if (roomChannel) {
      supabase.removeChannel(roomChannel);
      roomChannel = null;
    }
  };

  const fetchRoomSnapshot = async (code: string) => {
    const { data, error } = await supabase
      .from("caro_rooms")
      .select("*")
      .eq("code", code)
      .single();

    if (error || !data) {
      if (myRole.value === 'guest') {
        showToast("Chủ phòng đã rời đi, phòng bị giải tán.");
        leaveRoom();
      } else {
        notice.value = "Không tìm thấy phòng hoặc lỗi khi tải.";
      }
      return null;
    }

    // Adapt DB row to Snapshot format
    const row = data as any;
    const newSnapshot: RoomSnapshot = {
      code: row.code,
      board: row.board,
      turn: row.turn,
      winner: row.winner,
      status: row.status,
      winningLine: row.winning_line,
      lastMove: null,
      players: [
        { role: 'host', name: row.host_name, connected: row.host_connected, ready: row.host_ready },
        { role: 'guest', name: row.guest_name, connected: row.guest_connected, ready: row.guest_ready }
      ],
      scores: row.scores,
      recentChat: row.recent_chat,
      timeLeft: row.time_left,
      updatedAt: row.updated_at
    };

    const oldTurn = snapshot.value?.turn;
    const oldStatus = snapshot.value?.status;
    snapshot.value = newSnapshot;
    notifyTurn(newSnapshot.turn, newSnapshot.status, oldStatus, oldTurn);
    return newSnapshot;
  };

  const connect = async (role: "host" | "guest", roomCode: string, name: string) => {
    unsubscribeAll();
    myRole.value = role;
    userName.value = name;
    roomCodeInput.value = roomCode;
    connectionState.value = "connecting";

    const currentSnapshot = await fetchRoomSnapshot(roomCode);
    if (!currentSnapshot) {
      connectionState.value = "error";
      return;
    }

    connectionState.value = "connected";
    notice.value = "";
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("room") !== roomCode) {
      window.history.replaceState({}, "", `?room=${roomCode}`);
    }

    // Subscribe to DB changes for this room
    roomChannel = supabase.channel(`room:${roomCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'caro_rooms', filter: `code=eq.${roomCode}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            if (myRole.value === 'guest') {
              showToast("Chủ phòng đã rời đi, phòng bị giải tán.");
              leaveRoom();
            }
          } else {
            const oldGuest = snapshot.value?.players.find(p => p.role === 'guest')?.name;
            fetchRoomSnapshot(roomCode).then((newSnap) => {
              if (newSnap && myRole.value === 'host') {
                const newGuest = newSnap.players.find(p => p.role === 'guest')?.name;
                if (oldGuest !== 'Guest' && newGuest === 'Guest') {
                  showToast("Người chơi kia đã rời đi, đang chờ người mới...");
                }
              }
            });
          }
        }
      )
      .subscribe();
  };

  const sendRoomAction = async (type: string, data: any = {}) => {
    if (!snapshot.value || !myRole.value) return;
    
    try {
      isLoading.value = true;
      const response = await fetch("/api/game/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: snapshot.value.code,
          role: myRole.value,
          type,
          ...data
        })
      });
      
      const result = await response.json();
      if (!response.ok) {
        showToast(result.message || "Lỗi khi thực hiện hành động.");
      }
    } catch (err) {
      showToast("Lỗi mạng khi kết nối máy chủ.");
    } finally {
      isLoading.value = false;
    }
  };

  const createRoom = async () => {
    if (!userName.value.trim()) {
      notice.value = "Vui lòng nhập tên của bạn.";
      return;
    }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    try {
      isLoading.value = true;
      const resp = await fetch("/api/game/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name: userName.value })
      });
      const result = await resp.json();
      if (resp.ok) {
        connect("host", code, userName.value);
      } else {
        notice.value = result.message;
      }
    } catch (err) {
      notice.value = "Lỗi khi tạo phòng.";
    } finally {
      isLoading.value = false;
    }
  };

  const joinRoom = async (roomCodeOverride?: string) => {
    if (!userName.value.trim()) {
      notice.value = "Vui lòng nhập tên của bạn.";
      return;
    }
    const targetRoomCode = normalizeRoomCode(
      roomCodeOverride ?? roomCodeInput.value,
    );
    roomCodeInput.value = targetRoomCode;

    if (targetRoomCode.length < 6) {
      notice.value = "Mã phòng không hợp lệ.";
      return;
    }

    try {
      isLoading.value = true;
      const resp = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: targetRoomCode, name: userName.value })
      });
      const result = await resp.json();
      if (resp.ok) {
        connect("guest", targetRoomCode, userName.value);
      } else {
        notice.value = result.message;
      }
    } catch (err) {
      notice.value = "Lỗi khi tham gia phòng.";
    } finally {
      isLoading.value = false;
    }
  };

  const playCell = async (row: number, col: number) => {
    if (!canPlayCell(row, col)) return;
    loadingCell.value = { row, col };
    try {
      await sendRoomAction("move", { row, col });
    } finally {
      loadingCell.value = null;
    }
  };

  const toggleReady = () => sendRoomAction("ready");
  const startGame = () => sendRoomAction("start");
  const restartMatch = () => sendRoomAction("restart");

  const sendChatMessage = () => {
    if (!chatInput.value.trim()) return;
    sendRoomAction("chat", { text: chatInput.value });
    chatInput.value = "";
  };

  const fetchRoomList = async () => {
    if (snapshot.value) return;
    try {
      const response = await fetch("/api/rooms");
      if (response.ok) {
        const payload = await response.json();
        roomList.value = payload.rooms ?? [];
      }
    } catch (err) {
      roomList.value = [];
    }
  };

  const connectLobby = () => {
    if (snapshot.value || lobbyChannel) return;

    fetchRoomList();
    lobbyChannel = supabase.channel('lobby')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'caro_rooms' },
        () => {
          fetchRoomList();
        }
      )
      .subscribe();
  };

  onMounted(() => {
    userName.value = window.localStorage.getItem("caro-user-name") ?? "";
    const savedRoom = window.sessionStorage.getItem("caro-room-code") ?? "";
    const savedRole = window.sessionStorage.getItem("caro-room-role") as Role | null;

    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = normalizeRoomCode(urlParams.get("room") ?? "");

    if (roomFromUrl) {
      roomCodeInput.value = roomFromUrl;
      if (roomFromUrl === savedRoom && savedRole && userName.value) {
        connect(savedRole, roomFromUrl, userName.value);
      }
    }

    if (!snapshot.value) {
      connectLobby();
    }

    // Handle tab closing
    window.addEventListener('beforeunload', () => {
      if (snapshot.value && myRole.value) {
        // Use keepalive fetch if possible, or just send it and hope for the best.
        // On Vercel, it might not finish, but it's the best we can do without Presence webhooks.
        fetch("/api/game/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            code: snapshot.value.code,
            role: myRole.value,
            type: 'leave'
          })
        });
      }
    });
  });

  watch(userName, (val) => window.localStorage.setItem("caro-user-name", val));
  watch(roomCodeInput, (val) => {
    roomCodeInput.value = normalizeRoomCode(val);
    window.sessionStorage.setItem("caro-room-code", roomCodeInput.value);
  });
  watch(myRole, (val) => {
    if (val) window.sessionStorage.setItem("caro-room-role", val);
  });
  watch(snapshot, (val) => {
    if (!val) {
      connectLobby();
    } else if (lobbyChannel) {
      supabase.removeChannel(lobbyChannel);
      lobbyChannel = null;
    }
  });

  const leaveRoom = async () => {
    if (snapshot.value && myRole.value) {
      await sendRoomAction("leave");
    }
    unsubscribeAll();
    snapshot.value = null;
    connectionState.value = "idle";
    myRole.value = null;
    window.history.replaceState({}, "", window.location.pathname);
  };

  return {
    userName,
    roomCodeInput,
    snapshot,
    roomList,
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
    leaveRoom,
    fetchRoomList,
    toggleReady,
    startGame,
    playCell,
    restartMatch,
    sendChatMessage,
    canPlayCell,
    isLoading,
    loadingCell,
  };
}
