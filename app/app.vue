<script setup lang="ts">
import { computed } from 'vue'
import { useCaroGame } from './composables/useCaroGame'
import CaroSetup from './components/CaroSetup.vue'
import CaroScoreboard from './components/CaroScoreboard.vue'
import CaroBoard from './components/CaroBoard.vue'
import CaroChat from './components/CaroChat.vue'
import AppToast from './components/AppToast.vue'

const {
  userName,
  roomCodeInput,
  snapshot,
  notice,
  connectionState,
  myRole,
  mySeatLabel,
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
} = useCaroGame()

const panelClass = 'rounded-[24px] border border-[rgba(179,224,193,0.12)] bg-[rgba(6,18,12,0.72)] p-5 backdrop-blur-[18px]'
const eyebrowClass = 'mb-2 text-xs uppercase tracking-[0.24em] text-caro-accent'
const ghostButtonClass = 'rounded-xl border border-[rgba(179,224,193,0.12)] bg-transparent px-5 py-2.5 font-semibold text-white transition duration-200 hover:-translate-y-px hover:opacity-90'
const statusCardClass = 'flex items-center gap-4 rounded-[18px] border border-[rgba(179,224,193,0.12)] bg-[rgba(6,18,12,0.72)] px-[18px] py-3 backdrop-blur-[18px]'

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

const boardStateLabel = computed(() => {
  switch (snapshot.value?.status) {
    case 'playing': return 'Đang đấu'
    case 'finished': return 'Kết thúc'
    default: return 'Chờ đủ 2 người'
  }
})

const resultLabel = computed(() => {
  if (!snapshot.value?.winner) return ''
  return snapshot.value.winner === 'draw'
    ? 'Kết quả: hòa ván này.'
    : `Kết quả: ${snapshot.value.winner} chiến thắng.`
})

const canRestart = computed(() => connectionState.value === 'connected' && myRole.value === 'host')
</script>

<template>
  <main class="relative mx-auto min-h-screen max-w-[1440px] px-5 pb-10 pt-8 font-caro text-caro-text">
    <div class="pointer-events-none fixed -left-[10px] -top-10 h-[220px] w-[220px] rounded-full bg-[rgba(116,181,134,0.45)] opacity-[0.35] blur-[60px]" />
    <div class="pointer-events-none fixed -bottom-[40px] -right-[50px] h-[280px] w-[280px] rounded-full bg-[rgba(209,161,92,0.2)] opacity-[0.35] blur-[60px]" />

    <section class="mb-6 grid gap-5">
      <div>
        <p :class="eyebrowClass">Caro LAN MVP</p>
        <h1 class="max-w-[15ch] text-[clamp(2.2rem,5vw,4rem)] font-bold leading-[1.1]">
          Cờ caro online nội bộ, gọn và realtime.
        </h1>
        <p class="mt-4 max-w-[62ch] text-[1.05rem] text-[rgba(231,243,235,0.82)]">
          Tái cấu trúc mã nguồn theo đúng chuẩn Vue Best Practices để dễ mở rộng và bảo trì hơn.
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <div :class="statusCardClass">
          <span class="text-xs uppercase text-[rgba(231,243,235,0.62)]">Kết nối</span>
          <strong :class="['rounded-full px-3 py-1 text-[0.9rem]', connectionTone]">{{ connectionLabel }}</strong>
        </div>
        <div v-if="snapshot" :class="statusCardClass">
          <span class="text-xs uppercase text-[rgba(231,243,235,0.62)]">Trạng thái bàn cờ</span>
          <strong>{{ boardStateLabel }}</strong>
        </div>
      </div>
    </section>

    <section class="grid gap-6 xl:grid-cols-[350px_minmax(0,1fr)_320px] xl:items-start">
      <aside class="order-2 grid gap-5 xl:order-none">
        <CaroSetup
          v-if="!snapshot"
          v-model:userName="userName"
          v-model:roomCode="roomCodeInput"
          @create="createRoom"
          @join="joinRoom"
        />

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
            <button :class="ghostButtonClass" @click="restartMatch">Bắt đầu ván mới</button>
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

      <CaroBoard
        class="order-1 xl:order-none"
        :snapshot="snapshot"
        :canPlayCell="canPlayCell"
        @play="playCell"
      />

      <CaroChat
        class="order-3 xl:order-none"
        v-model="chatInput"
        :history="chatHistory"
        :myRole="myRole"
        @send="sendChatMessage"
      />
    </section>

    <div
      v-if="resultLabel"
      class="fixed bottom-10 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-[#ffcc66] px-[30px] py-2.5 font-extrabold text-caro-bg-deep"
    >
      {{ resultLabel }}
    </div>

    <AppToast :items="toasts" />
  </main>
</template>
