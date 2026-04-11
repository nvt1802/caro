<script setup lang="ts">
import { useCaroGame } from '~/composables/useCaroGame'

const {
  userName,
  notice,
  isLoading,
  user
} = useCaroGame()

const handleStart = () => {
  if (!userName.value.trim()) {
    return
  }

  // Check if there was a room we were trying to join
  const pendingRoom = window.localStorage.getItem('caro-pending-room')
  if (pendingRoom) {
    window.localStorage.removeItem('caro-pending-room')
    navigateTo(`/room/${pendingRoom}`)
  } else {
    navigateTo('/lobby')
  }
}
</script>

<template>
  <div class="flex min-h-[60vh] flex-col items-center justify-center py-12 px-6">
    <div
      class="w-full max-w-md space-y-8 rounded-[32px] border border-[rgba(179,224,193,0.12)] bg-[rgba(6,18,12,0.72)] p-10 backdrop-blur-[24px]">
      <div class="text-center">
        <div
          class="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-[rgba(74,164,111,0.15)] text-caro-accent mb-6 overflow-hidden border border-white/5 shadow-2xl group transition-transform hover:scale-105"
        >
          <img src="/logo.png" alt="MultiChess Logo" class="w-full h-full object-cover">
        </div>
        <h2 class="text-3xl font-bold tracking-tight text-white mb-2">Chào mừng bạn đến với <span class="text-caro-accent italic">MultiChess</span>!</h2>
        <p class="text-[rgba(231,243,235,0.72)] text-sm">Nền tảng đấu trí đa năng: Caro, Cờ Vua & Cờ Tướng.</p>
      </div>

      <div class="space-y-6">
        <!-- Authenticated State -->
        <div v-if="user" class="space-y-4">
          <div class="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
            <p class="text-[rgba(231,243,235,0.6)] text-sm mb-1">Đã đăng nhập thành công</p>
            <p class="text-xl font-bold text-white">{{ userName }}</p>
          </div>
          <button
            @click="navigateTo('/lobby')"
            class="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-caro-accent px-6 py-4 font-bold text-caro-bg-deep transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_25px_rgba(116,181,134,0.4)]"
          >
            <span>Vào sảnh chờ ngay</span>
            <Icon
              name="mdi:arrow-right"
              class="transition-transform duration-300 group-hover:translate-x-1"
            />
          </button>
        </div>

        <!-- Guest State -->
        <template v-else>
          <div class="space-y-2">
            <label class="block text-xs font-bold uppercase tracking-[0.2em] text-caro-accent ml-1"
              >Tên của bạn (Chế độ khách)</label
            >
            <input
              v-model="userName"
              type="text"
              placeholder="Nhập tên để chơi nhanh..."
              class="w-full rounded-2xl border border-[rgba(179,224,193,0.12)] bg-[rgba(12,25,18,0.8)] px-5 py-4 text-white placeholder:text-[rgba(231,243,235,0.25)] outline-none transition-all duration-300 focus:border-caro-accent focus:ring-4 focus:ring-caro-accent/10"
              @keyup.enter="handleStart"
            />
          </div>

          <button
            @click="handleStart"
            :disabled="!userName.trim()"
            class="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-caro-accent px-6 py-4 font-bold text-caro-bg-deep transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_25px_rgba(116,181,134,0.4)] disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
          >
            <span>Bắt đầu chơi ngay</span>
            <Icon
              name="mdi:play"
              class="transition-transform duration-300 group-hover:scale-125"
            />
          </button>

          <div class="relative py-2">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-white/5"></div>
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-[#06120c] px-4 text-[rgba(231,243,235,0.3)] tracking-widest font-bold">Hoặc</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <NuxtLink
              to="/login"
              class="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <Icon name="mdi:login" />
              Đăng nhập
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <Icon name="mdi:account-plus" />
              Đăng ký
            </NuxtLink>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
