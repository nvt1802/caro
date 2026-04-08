<script setup lang="ts">
defineProps<{
  userName: string
  roomCode: string
}>()

const emit = defineEmits<{
  (e: 'update:userName', value: string): void
  (e: 'update:roomCode', value: string): void
  (e: 'create'): void
  (e: 'join'): void
}>()

const panelClass = 'rounded-[24px] border border-[rgba(179,224,193,0.12)] bg-[rgba(6,18,12,0.72)] p-5 backdrop-blur-[18px]'
const labelClass = 'text-[0.85rem] text-[rgba(231,243,235,0.7)]'
const inputClass = 'w-full rounded-xl border border-[rgba(179,224,193,0.12)] bg-[rgba(12,25,18,0.8)] px-4 py-3 text-white outline-none transition focus:border-caro-accent'
const primaryButtonClass = 'rounded-xl bg-[#4aa46f] px-5 py-2.5 font-semibold text-white transition duration-200 hover:-translate-y-px hover:opacity-90'
const neutralButtonClass = 'rounded-xl bg-[ButtonFace] px-5 py-2.5 font-semibold text-[ButtonText] transition duration-200 hover:-translate-y-px hover:opacity-90'
</script>

<template>
  <div :class="[panelClass, 'grid gap-4']">
    <header>
      <p class="mb-2 text-xs uppercase tracking-[0.24em] text-caro-accent">Thiết lập ván đấu</p>
    </header>

    <div class="grid gap-4">
      <div class="grid gap-1.5">
        <label :class="labelClass">Tên của bạn</label>
        <input
          :value="userName"
          :class="inputClass"
          placeholder="Ví dụ: Anh Ba, Chị Bảy..."
          @input="emit('update:userName', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div class="my-2 text-center text-xs text-[rgba(231,243,235,0.4)]">
        <span>Tạo phòng mới hoặc dùng mã để vào</span>
      </div>

      <div class="grid gap-3">
        <button :class="primaryButtonClass" @click="emit('create')">
          Tạo phòng
        </button>

        <div class="flex gap-2">
          <input
            :value="roomCode"
            :class="[inputClass, 'flex-1']"
            placeholder="Mã phòng (6 ký tự)"
            maxlength="6"
            @input="emit('update:roomCode', ($event.target as HTMLInputElement).value)"
          />
          <button :class="neutralButtonClass" @click="emit('join')">
            Vào phòng
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
