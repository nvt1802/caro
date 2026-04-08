<script setup lang="ts">
defineProps<{
  items: { id: number; text: string }[]
}>()
</script>

<template>
  <div class="fixed left-1/2 top-[100px] z-[9999] flex -translate-x-1/2 flex-col gap-2">
    <TransitionGroup
      enter-active-class="transition-all duration-300"
      enter-from-class="-translate-y-5 opacity-0"
      leave-active-class="transition-all duration-300"
      leave-to-class="-translate-y-5 opacity-0"
    >
      <div
        v-for="toast in items"
        :key="toast.id"
        class="rounded-xl border border-[rgba(255,255,255,0.2)] bg-[#4aa46f] px-6 py-3 font-bold text-white shadow-toast"
      >
        {{ toast.text }}
      </div>
    </TransitionGroup>
  </div>
</template>
