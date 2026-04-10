<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useCaroGame } from '~/composables/useCaroGame'
import CaroScoreboard from '~/components/CaroScoreboard.vue'
import CaroBoard from '~/components/CaroBoard.vue'
import CaroChat from '~/components/CaroChat.vue'
import BaseDialog from '~/components/BaseDialog.vue'

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
  verifyAccess,
  connect,
  myMark
} = useCaroGame()

const isVerified = ref(false)

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
    window.localStorage.setItem('caro-pending-room', roomCode)
    navigateTo('/')
    return
  }

  // Check access first
  const result = await verifyAccess(roomCode)

  if (result.success) {
    isVerified.value = true
    // If we arrived here without being "connected" yet (e.g. direct link)
    if (connectionState.value !== 'connected' || snapshot.value?.code !== roomCode) {
      // Role is now auto-detected in useCaroGame
      await connect(roomCode, userName.value)
    }
  } else if (result.isPrivate) {
    // New Requirement: If private, kick directly to lobby
    notice.value = "Phòng kín chỉ có thể truy cập từ Sảnh chờ."
    setTimeout(() => navigateTo('/lobby'), 2000)
  } else {
    // Room not found or other fatal error
    notice.value = result.message || 'Không thể truy cập phòng này.'
    setTimeout(() => navigateTo('/lobby'), 2000)
  }
})

const panelClass = 'rounded-[24px] border border-[rgba(179,224,193,0.12)] bg-[rgba(6,18,12,0.72)] p-5 backdrop-blur-[18px]'
const eyebrowClass = 'mb-2 text-xs uppercase tracking-[0.24em] text-caro-accent'
const ghostButtonClass = 'rounded-xl border border-[rgba(179,224,193,0.12)] bg-transparent px-5 py-2.5 font-semibold text-white transition duration-200 hover:-translate-y-px hover:opacity-90'
const statusCardClass = 'flex items-center gap-4 rounded-[18px] border border-[rgba(179,224,193,0.12)] bg-[rgba(6,18,12,0.72)] px-[18px] py-3 backdrop-blur-[18px]'

const canRestart = computed(() => connectionState.value === 'connected' && myRole.value === 'host')

const showRestartConfirm = ref(false)
const confirmRestart = async () => {
  showRestartConfirm.value = false
  await restartMatch()
}

const showWinnerDialog = ref(false)
const winnerInfo = computed(() => {
  if (!snapshot.value || snapshot.value.status !== 'finished') return null

  if (snapshot.value.winner === 'draw') {
    return { title: 'Hòa cờ!', message: 'Trận đấu kết thúc với kết quả Hòa.', color: 'text-amber-400' }
  }

  const isMe = snapshot.value.winner === myMark.value
  const winnerMark = snapshot.value.winner
  const winnerPlayer = snapshot.value.players.find(p => p.role === (winnerMark === 'X' ? 'host' : 'guest'))
  const winnerName = winnerPlayer?.name || 'Đối thủ'

  return {
    title: isMe ? 'Bạn đã thắng! 🎉' : 'Bạn đã thua...',
    message: isMe ? 'Tuyệt vời, bạn đã đánh bại đối thủ!' : `${winnerName} đã giành chiến thắng ván này.`,
    color: isMe ? 'text-caro-accent' : 'text-red-400'
  }
})

watch(() => snapshot.value?.status, (status) => {
  if (status === 'finished') {
    showWinnerDialog.value = true
  } else {
    showWinnerDialog.value = false
  }
})
</script>

<template>
  <div v-if="isVerified" class="space-y-6 pb-12">
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
    <section class="grid gap-4 sm:gap-6 xl:grid-cols-[350px_minmax(0,1fr)_320px] xl:items-start">
      <!-- Left Column: Score & Info -->
      <aside class="order-1 xl:order-none grid gap-4 sm:gap-5">
        <CaroScoreboard v-if="snapshot" :snapshot="snapshot" :myRole="myRole" :mySeatLabel="mySeatLabel"
          :scoreboard="scoreboard" :timeLeft="timeLeft" @ready="toggleReady" @start="startGame" @restart="showRestartConfirm = true" />

        <div v-if="notice" :class="panelClass">
          <div class="rounded-[10px] border border-[rgba(200,165,87,0.2)] bg-[rgba(200,165,87,0.1)] p-2.5 text-[0.85rem] sm:text-[0.9rem] text-[#f5d79a]">
            {{ notice }}
          </div>
        </div>

        <div :class="[panelClass, 'hidden sm:block']">
          <p :class="eyebrowClass">Luật chơi</p>
          <ul class="list-disc space-y-1.5 pl-[18px] text-[0.85rem] text-[rgba(231,243,235,0.7)]">
            <li>Host là X, Guest là O.</li>
            <li>Đủ 2 người ván đấu sẽ được bắt đầu sau khi cả 2 người chơi nhấn nút "Sẵn sàng".</li>
            <li>Ai có 5 quân liên tiếp trước sẽ thắng.</li>
            <li>Tổng thời gian mỗi ván: 3 phút. Hết giờ người đang lượt đi sẽ thua.</li>
          </ul>
        </div>
      </aside>

      <!-- Center: The Board -->
      <div class="order-2 xl:order-none overflow-hidden">
        <CaroBoard :snapshot="snapshot" :canPlayCell="canPlayCell" :loadingCell="loadingCell" @play="playCell" />

        <div v-if="!snapshot && connectionState === 'connecting'"
          class="flex flex-col items-center justify-center p-20 animate-pulse">
          <div class="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-caro-accent mb-4" />
          <p class="text-white">Đang tải dữ liệu trận đấu...</p>
        </div>
      </div>

      <!-- Right: Chat -->
      <CaroChat v-if="snapshot" class="order-3 xl:order-none" v-model="chatInput" :history="chatHistory"
        :myRole="myRole" :isChatting="isChatting" @send="sendChatMessage" />
    </section>

    <!-- Winner Dialog -->
    <BaseDialog :show="showWinnerDialog" :title="winnerInfo?.title || 'Kết quả'" @close="showWinnerDialog = false">
      <div v-if="winnerInfo" class="space-y-4 text-center py-4">
        <div class="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 mb-2">
          <span :class="['text-5xl font-bold', winnerInfo.color]">
            {{ snapshot?.winner === 'draw' ? '=' : snapshot?.winner }}
          </span>
        </div>
        <h3 :class="['text-2xl font-bold', winnerInfo.color]">{{ winnerInfo.title }}</h3>
        <p class="text-[rgba(231,243,235,0.7)]">{{ winnerInfo.message }}</p>
      </div>

      <template #footer>
        <button :class="ghostButtonClass" @click="handleLeave">Rời phòng</button>
        <button v-if="canRestart"
          :class="['rounded-xl bg-caro-accent px-6 py-2.5 font-bold text-caro-bg-deep transition']"
          @click="showRestartConfirm = true">
          Đấu tiếp
        </button>
      </template>
    </BaseDialog>
    <BaseDialog :show="showRestartConfirm" title="Xác nhận bắt đầu lại" @close="showRestartConfirm = false">
      <div class="space-y-4 text-center py-4">
        <div class="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 mb-2">
          <Icon name="mdi:refresh" class="text-5xl text-caro-accent" />
        </div>
        <h3 class="text-xl font-bold text-white">Bắt đầu ván mới?</h3>
        <p class="text-[rgba(231,243,235,0.7)]">
          Bạn có chắc chắn muốn bắt đầu lại ván đấu không? 
          <span v-if="snapshot?.status === 'playing'" class="block mt-2 text-amber-400">Tiến trình hiện tại sẽ bị hủy bỏ.</span>
        </p>
      </div>

      <template #footer>
        <button :class="ghostButtonClass" @click="showRestartConfirm = false">Hủy</button>
        <button :class="['rounded-xl bg-caro-accent px-6 py-2.5 font-bold text-caro-bg-deep transition']"
          @click="confirmRestart">
          Xác nhận
        </button>
      </template>
    </BaseDialog>
  </div>

  <!-- Loading State before verification -->
  <div v-else class="flex flex-col items-center justify-center min-h-[60vh]">
    <div class="h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-caro-accent mb-4" />
    <p v-if="notice" class="text-red-400 mt-2">{{ notice }}</p>
    <p v-else class="text-white">Đang kiểm tra quyền truy cập...</p>
  </div>
</template>
