<script setup lang="ts">
import { onMounted } from "vue";
import { useCaroGame } from "~/composables/useCaroGame";
import RoomListPanel from "~/components/RoomListPanel.vue";
import LobbyHeader from "~/components/LobbyHeader.vue";
import LobbyRoomCreatePanel from "~/components/LobbyRoomCreatePanel.vue";
import LobbyJoinCodePanel from "~/components/LobbyJoinCodePanel.vue";
import LobbyPasswordDialog from "~/components/LobbyPasswordDialog.vue";
import type { RoomListItem } from "~~/shared/game";

const {
  userName,
  roomCodeInput,
  roomList,
  snapshot,
  createRoom,
  joinRoom,
  fetchRoomList,
  connectLobby,
  connectionState,
  isLoading,
  roomNameInput,
  roomPasswordInput,
  isRefreshingRoomList,
  userStats,
} = useCaroGame();

const showPasswordDialog = ref(false);
const passwordToJoin = ref("");
const joiningRoom = ref<RoomListItem | null>(null);
const isAi = ref(false);
const selectedGame = ref<"caro" | "chess" | "xiangqi">("caro");

const games = [
  {
    id: "caro",
    name: "Caro (15x15)",
    icon: "mdi:grid",
    description: "Đấu trí 5 quân liên tiếp",
  },
  {
    id: "chess",
    name: "Cờ Vua",
    icon: "mdi:chess-king",
    description: "Trận chiến quốc tế",
  },
  {
    id: "xiangqi",
    name: "Cờ Tướng",
    icon: "mdi:chess-rook",
    description: "Đại chiến phương Đông",
  },
] as const;

// Redirect to home if name is not set
onMounted(() => {
  if (!userName.value) {
    navigateTo("/");
  } else {
    connectLobby();
  }
});

const handleCreate = async (ai: boolean, game: "caro" | "chess" | "xiangqi") => {
  await createRoom(ai, game);
  if (roomCodeInput.value) {
    navigateTo(`/room/${roomCodeInput.value}`);
  }
};

const handleJoin = async (target?: RoomListItem | string) => {
  if (typeof target === "object" && target !== null) {
    if (target.isPrivate) {
      joiningRoom.value = target;
      passwordToJoin.value = "";
      showPasswordDialog.value = true;
      return;
    }
    await processJoin(target.code);
  } else {
    const code = (target as string) || roomCodeInput.value;
    if (!code) return;
    await processJoin(code);
  }
};

const processJoin = async (code: string, password?: string) => {
  await joinRoom(code, password);
  if (connectionState.value === "connected" || snapshot?.value?.code === code) {
    navigateTo(`/room/${code}`);
  }
};

const confirmPasswordJoin = async (password: string) => {
  if (!joiningRoom.value) return;
  const code = joiningRoom.value.code;

  showPasswordDialog.value = false;
  await processJoin(code, password);
};
</script>

<template>
  <div class="space-y-8 md:py-6">
    <!-- Header Section -->
    <LobbyHeader
      :user-name="userName"
      :user-stats="userStats"
      @change-name="navigateTo('/')"
    />

    <!-- Main Content -->
    <div class="grid gap-8 lg:grid-cols-[400px_1fr]">
      <!-- Creation & Join Aside -->
      <aside class="space-y-6">
        <LobbyRoomCreatePanel
          v-model:room-name="roomNameInput"
          v-model:room-password="roomPasswordInput"
          v-model:is-ai="isAi"
          v-model:selected-game="selectedGame"
          :is-loading="isLoading"
          :games="games"
          @create="handleCreate"
        />

        <LobbyJoinCodePanel
          v-model:room-code="roomCodeInput"
          :is-loading="isLoading"
          @join="handleJoin"
        />
      </aside>

      <!-- Room List Main -->
      <RoomListPanel
        :rooms="roomList"
        :is-refreshing="isRefreshingRoomList"
        @join="handleJoin"
        @refresh="fetchRoomList"
      />
    </div>

    <!-- Password Dialog -->
    <LobbyPasswordDialog
      v-model:password="passwordToJoin"
      :show="showPasswordDialog"
      :joining-room-name="joiningRoom?.name"
      :is-loading="isLoading"
      @close="showPasswordDialog = false"
      @confirm="confirmPasswordJoin"
    />
  </div>
</template>
