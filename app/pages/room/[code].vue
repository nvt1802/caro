<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useCaroGame } from '~/composables/useCaroGame'
import CaroScoreboard from '~/components/CaroScoreboard.vue'
import CaroBoard from '~/components/CaroBoard.vue'
import CaroChat from '~/components/CaroChat.vue'

const route = useRoute()
const roomCode = route.params.code as string

const {
  userName,
  snapshot,
  notice,
  connectionState,
  myRole,
  mySeatLabel,
  scoreboard,
  timeLeft,
  chatHistory,
  chatInput,
  toggleReady,
  startGame,
  playCell,
  restartMatch,
  sendChatMessage,
  canPlayCell,
  leaveRoom,
  isLoading,
  loadingCell,
  isChatting,
  connect
} = useCaroGame()

// Auto-navigate back to lobby if room is lost
watch([snapshot, connectionState], ([newSnap, newConn]) => {
  if (!newSnap && newConn !== 'connecting' && newConn !== 'connected') {
    navigateTo('/lobby')
  }
})

const handleLeave = async () => {
  await leaveRoom()
  navigateTo('/lobby')
}

const connectionLabel = computed(() => {
  switch (connectionState.value) {
    case 'connecting': return 'Đang nối...'
    case 'connected': return 'Đã vào phòng'
    case 'closed': return 'Đã ngắt'
    case 'error': return 'Lỗi kết nối'
    default: return 'Chưa kết nối'
  }
})

const connectionTone = computed(() => {
  switch (connectionState.value) {
    case 'connected': return 'bg-[rgba(74,164,111,0.18)] text-[#b8f0cb]'
    case 'connecting': return 'bg-[rgba(200,165,87,0.16)] text-[#f5d79a]'
    case 'error': return 'bg-[rgba(211,104,104,0.18)] text-[#ffb8b8]'
    default: return 'bg-white/5 text-[rgba(231,243,235,0.82)]'
  }
})

onMounted(async () => {
  // If no username, go back to setup
  if (!userName.value) {
    navigateTo('/')
    return
  }

  // If we arrived here without being "connected" yet (e.g. direct link)
  if (connectionState.value !== 'connected' || snapshot.value?.code !== roomCode) {
    // Try to restore role from session storage if possible
    const savedRole = window.sessionStorage.getItem('caro-room-role') as any
    await connect(savedRole || 'guest', roomCode, userName.value)
  }
})

const panelClass = 'rounded-[24px] border border-[rgba(179,224,193,0.12)] bg-[rgba(6,18,12,0.72)] p-5 backdrop-blur-[18px]'
const eyebrowClass = 'mb-2 text-xs uppercase tracking-[0.24em] text-caro-accent'
const ghostButtonClass = 'rounded-xl border border-[rgba(179,224,193,0.12)] bg-transparent px-5 py-2.5 font-semibold text-white transition duration-200 hover:-translate-y-px hover:opacity-90'
const statusCardClass = 'flex items-center gap-4 rounded-[18px] border border-[rgba(179,224,193,0.12)] bg-[rgba(6,18,12,0.72)] px-[18px] py-3 backdrop-blur-[18px]'

const canRestart = computed(() => connectionState.value === 'connected' && myRole.value === 'host')
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- Game Header / Stats -->
    <section class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap gap-3">
        <div :class="statusCardClass">
          <span class="text-xs uppercase text-[rgba(231,243,235,0.62)]">Phòng</span>
          <strong class="text-caro-accent tracking-widest font-mono text-lg">{{ roomCode }}</strong>
        </div>
        <div :class="statusCardClass">
          <span class="text-xs uppercase text-[rgba(231,243,235,0.62)]">Kết nối</span>
          <strong :class="['rounded-full px-3 py-1 text-[0.9rem]', connectionTone]">{{ connectionLabel }}</strong>
        </div>
        <button :class="ghostButtonClass" @click="handleLeave">Rời phòng</button>
      </div>
    </section>

    <!-- Main Game Grid -->
    <section class="grid gap-6 xl:grid-cols-[350px_minmax(0,1fr)_320px] xl:items-start">
      <!-- Left Column: Score & Info -->
      <aside class="order-2 grid gap-5 xl:order-none">
        <CaroScoreboard
          v-if="snapshot"
          :snapshot="snapshot"
          :myRole="myRole"
          :mySeatLabel="mySeatLabel"
          :scoreboard="scoreboard"
          :timeLeft="timeLeft"
          @ready="toggleReady"
          @start="startGame"
        />

        <div v-if="canRestart || notice" :class="panelClass">
          <div
            v-if="notice"
            class="mb-3 rounded-[10px] border border-[rgba(200,165,87,0.2)] bg-[rgba(200,165,87,0.1)] p-2.5 text-[0.9rem] text-[#f5d79a]"
          >
            {{ notice }}
          </div>
          <div v-if="canRestart">
            <button :class="ghostButtonClass" @click="restartMatch" class="w-full">Bắt đầu ván mới</button>
          </div>
        </div>

        <div :class="panelClass">
          <p :class="eyebrowClass">Luật chơi</p>
          <ul class="list-disc space-y-1.5 pl-[18px] text-[0.85rem] text-[rgba(231,243,235,0.7)]">
            <li>Host là X, Guest là O.</li>
            <li>Đủ 2 người ván đấu sẽ được bắt đầu sau khi cả 2 người chơi nhấn nút "Sẵn sàng".</li>
            <li>Ai có 5 quân liên tiếp trước sẽ thắng.</li>
            <li>Mỗi lượt có 30 giây suy nghĩ.</li>
          </ul>
        </div>
      </aside>

      <!-- Center: The Board -->
      <div class="order-1 xl:order-none">
        <CaroBoard
          :snapshot="snapshot"
          :canPlayCell="canPlayCell"
          :loadingCell="loadingCell"
          @play="playCell"
        />
        
        <div v-if="!snapshot && connectionState === 'connecting'" class="flex flex-col items-center justify-center p-20 animate-pulse">
           <div class="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-caro-accent mb-4" />
           <p class="text-white">Đang tải dữ liệu trận đấu...</p>
        </div>
      </div>

      <!-- Right: Chat -->
      <CaroChat
        v-if="snapshot"
        class="order-3 xl:order-none"
        v-model="chatInput"
        :history="chatHistory"
        :myRole="myRole"
        :isChatting="isChatting"
        @send="sendChatMessage"
      />
    </section>
  </div>
</template>
