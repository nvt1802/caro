<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useCaroGame } from '~/composables/useCaroGame'
import RoomListPanel from '~/components/RoomListPanel.vue'
import BaseDialog from '~/components/BaseDialog.vue'
import type { RoomListItem } from '#shared/caro'

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
  roomPasswordInput
} = useCaroGame()

const showPasswordDialog = ref(false)
const passwordToJoin = ref('')
const joiningRoom = ref<RoomListItem | null>(null)
const isAi = ref(false)

// Redirect to home if name is not set
onMounted(() => {
  if (!userName.value) {
    navigateTo('/')
  } else {
    connectLobby()
  }
})

const handleCreate = async () => {
  await createRoom(isAi.value)
  if (roomCodeInput.value) {
    navigateTo(`/room/${roomCodeInput.value}`)
  }
}

const handleJoin = async (target?: RoomListItem | string) => {
  if (typeof target === 'object' && target !== null) {
    if (target.isPrivate) {
      joiningRoom.value = target
      passwordToJoin.value = ''
      showPasswordDialog.value = true
      return
    }
    await processJoin(target.code)
  } else {
    const code = (target as string) || roomCodeInput.value
    if (!code) return
    await processJoin(code)
  }
}

const processJoin = async (code: string, password?: string) => {
  await joinRoom(code, password)
  if (connectionState.value === 'connected' || snapshot?.value?.code === code) {
    navigateTo(`/room/${code}`)
  }
}

const confirmPasswordJoin = async () => {
  if (!joiningRoom.value) return
  const code = joiningRoom.value.code
  const pass = passwordToJoin.value
  
  showPasswordDialog.value = false
  await processJoin(code, pass)
}

const panelClass = 'rounded-[24px] border border-[rgba(179,224,193,0.12)] bg-[rgba(6,18,12,0.72)] p-6 backdrop-blur-[18px]'
const inputClass = 'w-full rounded-xl border border-[rgba(179,224,193,0.12)] bg-[rgba(12,25,18,0.8)] px-4 py-3 text-white outline-none transition focus:border-caro-accent'
const primaryButtonClass = 'rounded-xl bg-caro-accent px-6 py-3 font-bold text-caro-bg-deep transition duration-200 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(116,181,134,0.3)]'
const ghostButtonClass = 'rounded-xl border border-[rgba(179,224,193,0.12)] bg-transparent px-6 py-3 font-semibold text-white transition duration-200 hover:bg-white/5'
</script>

<template>
  <div class="space-y-8 py-6">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <p class="mb-2 text-xs uppercase tracking-[0.24em] text-caro-accent font-bold">Sảnh Chờ</p>
        <h1 class="text-4xl font-bold text-white">Chào, {{ userName }}!</h1>
        <p class="mt-2 text-[rgba(231,243,235,0.6)]">Hãy chọn một phòng để bắt đầu hoặc tạo phòng mới.</p>
      </div>

      <div class="flex gap-3">
        <button
          class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          @click="navigateTo('/')">
          <Icon name="mdi:pencil" class="mr-2" />
          Đổi tên
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="grid gap-8 lg:grid-cols-[400px_1fr]">
      <!-- Creation & Join Aside -->
      <aside class="space-y-6">
        <div :class="panelClass">
          <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Icon name="mdi:plus-circle" class="text-caro-accent" />
            Tạo phòng mới
          </h3>
          <p class="text-sm text-[rgba(231,243,235,0.6)] mb-4">Bạn sẽ trở thành Host (X) và người khác có thể tham gia vào phòng của bạn.</p>
          
          <div class="space-y-3 mb-6">
            <div>
              <label class="text-[0.7rem] uppercase tracking-wider text-[rgba(231,243,235,0.5)] mb-1 block">Tên phòng (tùy chọn)</label>
              <input v-model="roomNameInput" :class="inputClass" placeholder="VD: Solo thắng thua vui vẻ..." />
            </div>
            <div>
              <label class="text-[0.7rem] uppercase tracking-wider text-[rgba(231,243,235,0.5)] mb-1 block">Mật khẩu (để trống nếu muốn phòng công khai)</label>
              <input v-model="roomPasswordInput" type="password" :class="inputClass" placeholder="Nhập mật khẩu..." />
            </div>
            <div class="flex items-center gap-3 py-2 cursor-pointer group" @click="isAi = !isAi">
              <div :class="['w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all', isAi ? 'bg-caro-accent border-caro-accent' : 'border-[rgba(179,224,193,0.12)] bg-white/5 group-hover:border-caro-accent/50']">
                <Icon v-if="isAi" name="mdi:check" class="text-caro-bg-deep text-lg font-bold" />
              </div>
              <span class="text-sm font-medium text-[rgba(231,243,235,0.8)] group-hover:text-white transition-colors">Chơi với máy (AI Mode)</span>
            </div>
          </div>

          <button :class="[primaryButtonClass, 'w-full flex items-center justify-center gap-2']" :disabled="isLoading"
            @click="handleCreate">
            <span>Bắt đầu phòng mới</span>
          </button>
        </div>

        <div :class="panelClass">
          <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Icon name="mdi:key-variant" class="text-caro-accent" />
            Vào bằng mã
          </h3>
          <div class="flex gap-2">
            <input v-model="roomCodeInput" :class="[inputClass, 'flex-1 uppercase font-mono tracking-widest']"
              placeholder="MÃ PHÒNG" maxlength="6" @keyup.enter="handleJoin()" />
            <button :class="ghostButtonClass" :disabled="!roomCodeInput || roomCodeInput.length < 6 || isLoading"
              @click="handleJoin()">
              Vào
            </button>
          </div>
        </div>
      </aside>

      <!-- Room List Main -->
      <RoomListPanel :rooms="roomList" @join="handleJoin" @refresh="fetchRoomList" />
    </div>

    <!-- Password Dialog -->
    <BaseDialog 
      :show="showPasswordDialog" 
      title="Yêu cầu mật khẩu" 
      @close="showPasswordDialog = false"
    >
      <div class="space-y-4">
        <p class="text-sm text-[rgba(231,243,235,0.6)]">
          Phòng <strong class="text-caro-accent">{{ joiningRoom?.name }}</strong> đang được bảo vệ. Vui lòng nhập mật khẩu để tham gia.
        </p>
        <input 
          v-model="passwordToJoin" 
          type="password" 
          :class="inputClass" 
          placeholder="Nhập mật khẩu tại đây..." 
          autofocus
          @keyup.enter="confirmPasswordJoin"
        />
      </div>
      
      <template #footer>
        <button :class="ghostButtonClass" @click="showPasswordDialog = false">Hủy</button>
        <button 
          :class="primaryButtonClass" 
          :disabled="!passwordToJoin || isLoading"
          @click="confirmPasswordJoin"
        >
          Xác nhận
        </button>
      </template>
    </BaseDialog>
  </div>
</template>
