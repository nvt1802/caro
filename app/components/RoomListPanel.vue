<script setup lang="ts">
import type { RoomListItem } from '#shared/caro'

defineProps<{
  rooms: RoomListItem[]
}>()

const emit = defineEmits<{
  (e: 'join', room: RoomListItem): void
  (e: 'refresh'): void
}>()

const panelClass = 'rounded-[24px] border border-[rgba(179,224,193,0.12)] bg-[rgba(6,18,12,0.72)] p-5 backdrop-blur-[18px]'
const ghostButtonClass = 'rounded-xl border border-[rgba(179,224,193,0.12)] bg-transparent px-4 py-2 font-semibold text-white transition duration-200 hover:-translate-y-px hover:opacity-90'
const primaryButtonClass = 'rounded-xl bg-[#4aa46f] px-4 py-2 font-semibold text-white transition duration-200 hover:-translate-y-px hover:opacity-90'

function formatStatus(status: RoomListItem['status']) {
  switch (status) {
    case 'playing':
      return 'Đang đấu'
    case 'finished':
      return 'Đã xong'
    default:
      return 'Chờ người chơi'
  }
}

function formatUpdatedAt(updatedAt: string) {
  return new Date(updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div :class="[panelClass, 'flex h-[400px] flex-col xl:h-[600px]']">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div>
        <p class="mb-2 text-xs uppercase tracking-[0.24em] text-caro-accent">Danh sách phòng</p>
        <p class="text-sm text-[rgba(231,243,235,0.68)]">Hiển thị tất cả phòng hiện có. Chỉ phòng chưa đủ người mới hiện nút join.</p>
      </div>
      <button :class="ghostButtonClass" @click="emit('refresh')">Làm mới</button>
    </div>

    <div v-if="rooms.length === 0" class="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[rgba(179,224,193,0.18)] px-6 text-center text-sm text-[rgba(231,243,235,0.6)]">
      Chưa có phòng nào được tạo. Bạn có thể tạo phòng mới ở khung bên trái.
    </div>

    <div v-else class="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
      <article
        v-for="room in rooms"
        :key="room.code"
        class="rounded-2xl border border-[rgba(179,224,193,0.12)] bg-[rgba(255,255,255,0.04)] p-4"
      >
        <div class="mb-3 flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <div class="text-lg font-bold truncate text-[rgba(231,243,235,0.95)]">{{ room.name }}</div>
              <div v-if="room.isAi" class="flex-shrink-0 text-sky-400" title="Chơi với máy">
                <Icon name="mdi:robot" size="18" />
              </div>
              <div v-if="room.isPrivate" class="flex-shrink-0 text-amber-400" title="Phòng có mật khẩu">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
            </div>
            <div class="mt-1 flex items-center gap-2 text-xs text-[rgba(231,243,235,0.5)]">
              <span class="rounded bg-white/5 px-1.5 py-0.5 font-mono uppercase tracking-wider">{{ room.code }}</span>
              <span>•</span>
              <span>{{ formatUpdatedAt(room.updatedAt) }}</span>
            </div>
          </div>
          <span class="rounded-full bg-white/5 px-3 py-1 text-xs text-[rgba(231,243,235,0.85)]">
            {{ formatStatus(room.status) }}
          </span>
        </div>

        <div class="grid gap-2 text-sm text-[rgba(231,243,235,0.85)]">
          <div class="flex items-center justify-between gap-3">
            <span class="text-[rgba(231,243,235,0.6)]">Host</span>
            <strong>{{ room.hostName }}</strong>
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="text-[rgba(231,243,235,0.6)]">Guest</span>
            <strong>{{ room.guestName }}</strong>
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="text-[rgba(231,243,235,0.6)]">Số người đang có</span>
            <strong>{{ room.connectedCount }}/2</strong>
          </div>
        </div>

        <div class="mt-4 flex justify-end">
          <button
            v-if="room.canJoin"
            :class="primaryButtonClass"
            @click="emit('join', room)"
          >
            Join
          </button>
        </div>
      </article>
    </div>
  </div>
</template>
