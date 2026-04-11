<script setup lang="ts">
import { nextTick, useTemplateRef, watch } from 'vue'
import type { ChatMessage, Role } from '~~/shared/game'

const props = defineProps<{
  history: ChatMessage[]
  myRole: Role | null
  isChatting?: boolean
}>()

const chatScrollRef = useTemplateRef<HTMLElement>('chatScroll')

watch(() => props.history, () => {
  nextTick(() => {
    if (chatScrollRef.value) {
      chatScrollRef.value.scrollTop = chatScrollRef.value.scrollHeight
    }
  })
}, { deep: true })

const emit = defineEmits<{
  (e: 'send'): void
  (e: 'update:modelValue', value: string): void
}>()

const modelValue = defineModel<string>()

const panelClass = 'rounded-[24px] border border-[rgba(179,224,193,0.12)] bg-[rgba(6,18,12,0.72)] p-4 sm:p-5 backdrop-blur-[18px]'
const inputClass = 'flex-1 rounded-xl border border-[rgba(179,224,193,0.12)] bg-[rgba(12,25,18,0.8)] px-4 py-3 text-[0.85rem] sm:text-[0.9rem] text-white outline-none transition focus:border-caro-accent'
const ghostButtonClass = 'rounded-xl border border-[rgba(179,224,193,0.12)] bg-transparent px-5 py-2.5 font-semibold text-white transition duration-200 hover:-translate-y-px hover:opacity-90'
</script>

<template>
  <div :class="[panelClass, 'flex h-[300px] sm:h-[400px] xl:h-[600px] flex-col']">
    <header>
      <p class="mb-2 text-xs uppercase tracking-[0.24em] text-caro-accent">Trò chuyện</p>
    </header>
    <div ref="chatScroll" class="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-2">
      <div
        v-for="(msg, idx) in history"
        :key="idx"
        :class="[
          'max-w-[90%]',
          msg.sender === myRole ? 'self-end' : 'self-start'
        ]"
      >
        <div class="mb-0.5 flex gap-2 text-[0.7rem] opacity-50">
          <span>{{ msg.name }}</span>
          <span>{{ msg.time }}</span>
        </div>
        <div
          :class="[
            'rounded-xl bg-[rgba(255,255,255,0.05)] px-3 py-2 text-[0.9rem]',
            msg.sender === myRole ? 'bg-[rgba(74,164,111,0.2)] text-[#b8f0cb]' : ''
          ]"
        >
          {{ msg.text }}
        </div>
      </div>
      <div v-if="history.length === 0" class="text-sm text-[rgba(231,243,235,0.6)]">Chưa có tin nhắn nào.</div>
    </div>
    <form class="mt-2.5 flex gap-2" @submit.prevent="emit('send')">
      <input v-model="modelValue" :class="inputClass" placeholder="Nhập tin nhắn..." maxlength="100" />
      <button type="submit" :class="ghostButtonClass" :disabled="isChatting">
        <div v-if="isChatting" class="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-caro-accent" />
        <span v-else>Gửi</span>
      </button>
    </form>
  </div>
</template>
