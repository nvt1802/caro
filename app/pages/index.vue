<script setup lang="ts">
import { useCaroGame } from '~/composables/useCaroGame'

const {
  userName,
  notice,
  isLoading
} = useCaroGame()

const onStart = () => {
  if (!userName.value.trim()) {
    return
  }
  navigateTo('/lobby')
}
</script>

<template>
  <div class="flex min-h-[60vh] flex-col items-center justify-center py-12 px-6">
    <div
      class="w-full max-w-md space-y-8 rounded-[32px] border border-[rgba(179,224,193,0.12)] bg-[rgba(6,18,12,0.72)] p-10 backdrop-blur-[24px]">
      <div class="text-center">
        <div
          class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(74,164,111,0.15)] text-caro-accent mb-6">
          <Icon name="mdi:controller-classic" size="32" />
        </div>
        <h2 class="text-3xl font-bold tracking-tight text-white mb-2">Chào mừng bạn!</h2>
        <p class="text-[rgba(231,243,235,0.72)] text-sm">Nhập tên để bắt đầu chơi Caro trực tuyến.</p>
      </div>

      <div class="space-y-6">
        <div>
          <label for="username" class="block text-xs font-semibold uppercase tracking-wider text-caro-accent mb-2">Tên
            của bạn</label>
          <input id="username" v-model="userName" type="text" placeholder="Ví dụ: Anh Quân"
            class="flex w-full rounded-xl border border-[rgba(179,224,193,0.12)] bg-[rgba(12,25,18,0.8)] px-5 py-3.5 text-white outline-none ring-caro-accent/20 transition focus:border-caro-accent focus:ring-4"
            @keyup.enter="onStart" />
        </div>

        <div v-if="notice" class="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {{ notice }}
        </div>

        <button
          class="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-caro-accent px-6 py-4 font-bold text-caro-bg-deep transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(116,181,134,0.4)] disabled:opacity-50"
          :disabled="!userName.trim() || isLoading" @click="onStart">
          <span>Vào Sảnh Chờ</span>
          <Icon name="mdi:arrow-right" class="transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  </div>
</template>
