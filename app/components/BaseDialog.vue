<script setup lang="ts">
defineProps<{
  show: boolean
  title?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const backdropClass = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4'
const panelClass = 'relative w-full max-w-md overflow-hidden rounded-[28px] border border-[rgba(179,224,193,0.15)] bg-[rgba(10,25,18,0.95)] p-6 shadow-2xl backdrop-blur-xl'
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="show" :class="backdropClass" @click.self="emit('close')">
        <div :class="panelClass">
          <!-- Header -->
          <div v-if="title" class="mb-4 flex items-center justify-between">
            <h3 class="text-xl font-bold text-white tracking-wide">{{ title }}</h3>
            <button 
              class="rounded-full p-1 text-[rgba(231,243,235,0.4)] transition hover:bg-white/10 hover:text-white"
              @click="emit('close')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <!-- Content -->
          <div class="mb-6">
            <slot />
          </div>

          <!-- Footer -->
          <div class="flex justify-end gap-3">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
