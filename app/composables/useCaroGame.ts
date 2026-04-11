import {
  type RoomSnapshot,
  type Mark,
  type RoomListItem,
  normalizePlayerName,
  normalizeRoomCode,
  type GameType,
} from "~~/shared/game";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Define channels outside the composable to maintain singleton behavior across pages
let roomChannel: RealtimeChannel | null = null;
let lobbyChannel: RealtimeChannel | null = null;

// Global counter for toasts to ensure unique IDs
let toastIdCounter = 0;

export function useCaroGame() {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();
  const userProfile = useState<any>("caro-userProfile", () => null);

  const userName = useState<string>("caro-userName", () => "");
  const roomCodeInput = useState<string>("caro-roomCodeInput", () => "");
  const snapshot = useState<RoomSnapshot | null>("caro-snapshot", () => null);
  const roomList = useState<RoomListItem[]>("caro-roomList", () => []);
  const notice = useState<string>("caro-notice", () => "");
  const connectionState = useState<
    "idle" | "connecting" | "connected" | "closed" | "error"
  >("caro-connectionState", () => "idle");
  const myRole = useState<"host" | "guest" | null>("caro-myRole", () => null);
  const chatInput = ref("");
  const toasts = useState<{ id: number; text: string }[]>(
    "caro-toasts",
    () => [],
  );
  const isLoading = useState<boolean>("caro-isLoading", () => false);
  const loadingCell = useState<{ row: number; col: number } | null>(
    "caro-loadingCell",
    () => null,
  );
  const isChatting = useState<boolean>("caro-isChatting", () => false);
  const roomNameInput = useState<string>("caro-roomNameInput", () => "");
  const roomPasswordInput = useState<string>(
    "caro-roomPasswordInput",
    () => "",
  );
  const isRefreshingRoomList = useState<boolean>(
    "caro-isRefreshingRoomList",
    () => false,
  );
  const userStats = useState<any[]>("caro-userStats", () => []);

  // Sync profile when user changes
  const fetchProfile = async () => {
    if (!user.value) {
      userProfile.value = null;
      return;
    }

    const { data } = await (supabase.from("profiles") as any)
      .select("*")
      .eq("id", user.value.id)
      .single();

    if (data) {
      userProfile.value = data;
      // prioritize display_name, fallback to username
      userName.value = data.display_name || data.username || user.value.email;
    }
  };

  const fetchUserStats = async () => {
    if (!user.value) {
      userStats.value = [];
      return;
    }
    try {
      const response = await fetch("/api/stats/my-stats");
      if (response.ok) {
        const { stats } = await response.json();
        userStats.value = stats;
      }
    } catch (e) {
      console.error("Error fetching stats:", e);
    }
  };

  if (import.meta.client) {
    watch(user, () => {
      fetchProfile();
      fetchUserStats();
    }, { immediate: true });
  }

  const mySeatLabel = computed(() => {
    if (!myRole.value || !snapshot.value) return "Đang xem...";
    const type = snapshot.value.gameType;
    if (type === 'chess') {
      return myRole.value === "host" ? "Trắng (Host)" : "Đen (Guest)";
    }
    if (type === 'xiangqi') {
      return myRole.value === "host" ? "Đỏ (Host)" : "Đen (Guest)";
    }
    return myRole.value === "host" ? "Host (X)" : "Guest (O)";
  });

  const myMark = computed(() => {
    if (myRole.value === "host") return "X";
    if (myRole.value === "guest") return "O";
    return null;
  });
  const scoreboard = computed(() => snapshot.value?.scores ?? { X: 0, O: 0 });
  
  // Real-time timer logic
  const clientTime = ref(Date.now());
  if (import.meta.client) {
    setInterval(() => {
      clientTime.value = Date.now();
    }, 1000);
  }

  const timeLeft = computed(() => {
    if (!snapshot.value || snapshot.value.status !== "playing") {
      return snapshot.value?.timeLeft ?? 180;
    }
    const lastUpdate = new Date(snapshot.value.updatedAt).getTime();
    const elapsed = Math.floor((clientTime.value - lastUpdate) / 1000);
    const remaining = Math.max(0, snapshot.value.timeLeft - elapsed);

    // If we detect timeout locally and we are the host, notify the server
    // (Choosing host to notify to avoid duplicate requests, but server double-checks)
    if (remaining === 0 && myRole.value === "host") {
      sendRoomAction("sync", {}, false);
    }

    return remaining;
  });
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

  function notifyResult(
    newSnapshot: RoomSnapshot,
    oldStatus: string | undefined,
  ) {
    if (newSnapshot.status === "finished" && oldStatus === "playing") {
      if (newSnapshot.winner === "draw") {
        showToast("Trận đấu kết thúc với kết quả Hòa!");
      } else if (newSnapshot.winner === myMark.value) {
        showToast("Tuyệt vời! Bạn là người chiến thắng! 🎉");
      } else {
        const winnerName = newSnapshot.players.find(
          (p) => p.role === (newSnapshot.winner === "X" ? "host" : "guest"),
        )?.name;
        showToast(`${winnerName} đã giành chiến thắng.`);
      }
    }
  }

  const unsubscribeAll = async () => {
    const promises = [];
    if (roomChannel) {
      promises.push(supabase.removeChannel(roomChannel));
      roomChannel = null;
    }
    if (lobbyChannel) {
      promises.push(supabase.removeChannel(lobbyChannel));
      lobbyChannel = null;
    }
    await Promise.all(promises);
  };

  const fetchRoomSnapshot = async (code: string) => {
    const normalizedCode = (code || "").trim().toUpperCase();
    const { data, error } = await (supabase.from("rooms") as any)
      .select("*")
      .eq("code", normalizedCode)
      .single();

    if (error || !data) {
      if (error) console.error("Supabase Fetch Error:", error);
      if (myRole.value === "guest") {
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
      gameType: row.game_type,
    };

    const oldTurn = snapshot.value?.turn;
    const oldStatus = snapshot.value?.status;
    snapshot.value = newSnapshot;

    // Sync role based on userName
    const me = newSnapshot.players.find((p) => p.name === userName.value);
    myRole.value = me ? (me.role as "host" | "guest") : null;

    notifyTurn(newSnapshot.turn, newSnapshot.status, oldStatus, oldTurn);
    notifyResult(newSnapshot, oldStatus);
    return newSnapshot;
  };

  const connect = async (
    roomCode: string,
    name: string,
  ) => {
    await unsubscribeAll();
    // role is no longer set manually, it will be synced in fetchRoomSnapshot
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

    // Subscribe to DB changes for this room
    roomChannel = supabase
      .channel(`room:${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `code=eq.${roomCode}`,
        },
        async (payload) => {
          console.log("Room Change Detected:", payload.eventType, payload);
          if (payload.eventType === "DELETE") {
            if (myRole.value === "guest") {
              console.log("Room deleted by Host, leaving...");
              showToast("Chủ phòng đã rời đi, phòng bị giải tán.");
              await leaveRoom();
            }
          } else {
            const oldGuest = snapshot.value?.players.find(
              (p) => p.role === "guest",
            )?.name;
            fetchRoomSnapshot(roomCode).then((newSnap) => {
              if (newSnap && myRole.value === "host") {
                const newGuest = newSnap.players.find(
                  (p) => p.role === "guest",
                )?.name;
                if (oldGuest !== "Guest" && newGuest === "Guest") {
                  showToast("Người chơi kia đã rời đi, đang chờ người mới...");
                }
              }
            });
          }
        },
      )
      .subscribe();
  };

  const sendRoomAction = async (
    type: string,
    data: any = {},
    showGlobalLoading = true,
  ) => {
    if (!snapshot.value || !myRole.value) return;

    if (showGlobalLoading) {
      isLoading.value = true;
    }

    try {
      const response = await fetch("/api/game/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: snapshot.value.code,
          role: myRole.value,
          type,
          ...data,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        showToast(result.message || "Lỗi khi thực hiện hành động.");
      }
    } catch (err) {
      showToast("Lỗi mạng khi kết nối máy chủ.");
    } finally {
      if (showGlobalLoading) {
        isLoading.value = false;
      }
    }
  };

  const createRoom = async (isAi: boolean = false, gameType: GameType = 'caro') => {
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
        body: JSON.stringify({
          code,
          name: userName.value,
          roomName: roomNameInput.value,
          password: roomPasswordInput.value,
          isAi,
          gameType,
        }),
      });
      const result = await resp.json();
      if (resp.ok) {
        roomCodeInput.value = code;
        await connect(code, userName.value);
      } else {
        notice.value = result.message;
      }
    } catch (err) {
      notice.value = "Lỗi khi tạo phòng.";
    } finally {
      isLoading.value = false;
    }
  };

  const verifyAccess = async (roomCode: string, password?: string) => {
    try {
      const resp = await fetch("/api/game/verify-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: roomCode, password, userName: userName.value }),
      });
      return await resp.json();
    } catch (e) {
      return { success: false, message: "Lỗi kết nối máy chủ." };
    }
  };

  const joinRoom = async (
    roomCodeOverride?: string,
    passwordOverride?: string,
  ) => {
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
        body: JSON.stringify({
          code: targetRoomCode,
          name: userName.value,
          password: passwordOverride ?? roomPasswordInput.value,
        }),
      });
      const result = await resp.json();
      if (resp.ok) {
        await connect(targetRoomCode, userName.value);
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
      await sendRoomAction("move", { row, col }, false);
    } finally {
      loadingCell.value = null;
    }
  };

  const playChessMove = async (move: string) => {
    if (!snapshot.value || snapshot.value.status !== 'playing') return;
    if (snapshot.value.turn !== myMark.value) return;
    
    isLoading.value = true;
    try {
      await sendRoomAction("move", { move }, false);
    } finally {
      isLoading.value = false;
    }
  };

  const toggleReady = () => sendRoomAction("ready");
  const startGame = () => sendRoomAction("start");
  const restartMatch = () => sendRoomAction("restart");

  const sendChatMessage = async () => {
    if (!chatInput.value.trim()) return;
    isChatting.value = true;
    try {
      await sendRoomAction("chat", { text: chatInput.value }, false);
      chatInput.value = "";
    } finally {
      isChatting.value = false;
    }
  };

  const fetchRoomList = async () => {
    isRefreshingRoomList.value = true;
    try {
      // Add timestamp to bypass browser cache
      const response = await fetch(`/api/rooms?t=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (response.ok) {
        const payload = await response.json();
        roomList.value = payload.rooms ?? [];
      }
    } catch (err) {
      roomList.value = [];
    } finally {
      isRefreshingRoomList.value = false;
    }
  };

  let isConnectingLobby = false;
  const connectLobby = async () => {
    // Avoid double-connecting or connecting while in a room
    if (snapshot.value || isConnectingLobby) return;

    // If already have a channel, make sure it's clean (some cases might leave it dangling)
    if (lobbyChannel) {
      await supabase.removeChannel(lobbyChannel);
      lobbyChannel = null;
    }

    isConnectingLobby = true;
    try {
      // Initial fetch to get latest state
      await fetchRoomList();

      lobbyChannel = supabase.channel("lobby-room-updates");

      lobbyChannel
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "rooms" },
          () => fetchRoomList(),
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "rooms" },
          () => fetchRoomList(),
        )
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "rooms" },
          () => fetchRoomList(),
        )
        .subscribe((status) => {
          console.log("Lobby Subscription Status:", status);
          if (status === "SUBSCRIBED") {
            fetchRoomList();
          }
        });
    } finally {
      isConnectingLobby = false;
    }
  };

  // Restored shared behavior handling for all players
  onMounted(() => {
    if (!userName.value) {
      userName.value = window.localStorage.getItem("caro-user-name") ?? "";
    }

    // Save username whenever it changes, but ONLY if NOT logged in (Guest mode)
    watch(userName, (newVal) => {
      if (!user.value) {
        window.localStorage.setItem("caro-user-name", newVal);
      }
    });

    // Global listener for Tab closing
    const handleUnload = () => {
      if (snapshot.value && myRole.value) {
        // Keeping it simple with keepalive fetch
        fetch("/api/game/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            code: snapshot.value.code,
            role: myRole.value,
            type: "leave",
          }),
        });
      }
    };
    window.addEventListener("beforeunload", handleUnload);
  });

  watch(userName, (val) => window.localStorage.setItem("caro-user-name", val));
  watch(roomCodeInput, (val) => {
    roomCodeInput.value = normalizeRoomCode(val);
    window.sessionStorage.setItem("caro-room-code", roomCodeInput.value);
  });
  watch(myRole, (val) => {
    if (val) window.sessionStorage.setItem("caro-room-role", val);
  });

  const leaveRoom = async () => {
    // Avoid re-entry
    if (!snapshot.value || !myRole.value) return;

    // Capture current info into local constants before clearing global state
    const code = snapshot.value.code;
    const role = myRole.value;

    // 1. Clear state IMMEDIATELY so Lobby connection isn't blocked
    snapshot.value = null;
    connectionState.value = "idle";
    myRole.value = null;

    // 2. Perform async cleanups in the background (or await them)
    try {
      // Use direct fetch to bypass the sendRoomAction guard which checks for snapshot
      fetch("/api/game/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, role, type: "leave" }),
      }).catch((e) => console.error("Leave room API error:", e));

      await unsubscribeAll();
    } catch (err) {
      console.error("Cleanup error during leave:", err);
    }

    // 3. Navigate away
    navigateTo("/lobby");
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
    playChessMove,
    restartMatch,
    sendChatMessage,
    canPlayCell,
    isLoading,
    loadingCell,
    isChatting,
    roomNameInput,
    roomPasswordInput,
    verifyAccess,
    connect,
    connectLobby,
    isRefreshingRoomList,
    user,
    userProfile,
    userStats,
    fetchUserStats,
    logout: async () => {
      await supabase.auth.signOut();
      userProfile.value = null;
      userName.value = window.localStorage.getItem("caro-user-name") ?? "";
    },
  };
}
