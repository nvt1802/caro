<script setup lang="ts">
const props = defineProps<{
  isLoading: boolean;
}>();

const emit = defineEmits<{
  join: [code: string];
}>();

const roomCode = defineModel<string>("roomCode", { default: "" });

const panelClass =
  "rounded-[24px] border border-[rgba(179,224,193,0.12)] bg-[rgba(6,18,12,0.72)] p-6 backdrop-blur-[18px]";
const inputClass =
  "w-full rounded-xl border border-[rgba(179,224,193,0.12)] bg-[rgba(12,25,18,0.8)] px-4 py-3 text-white outline-none transition focus:border-caro-accent";
const ghostButtonClass =
  "rounded-xl border border-[rgba(179,224,193,0.12)] bg-transparent px-6 py-3 font-semibold text-white transition duration-200 hover:bg-white/5";
</script>

<template>
  <div :class="panelClass">
    <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
      <Icon name="mdi:key-variant" class="text-caro-accent" />
      Vào bằng mã
    </h3>
    <div class="flex gap-2">
      <input
        v-model="roomCode"
        :class="[inputClass, 'flex-1 uppercase font-mono tracking-widest']"
        placeholder="MÃ PHÒNG"
        maxlength="6"
        @keyup.enter="emit('join', roomCode)"
      />
      <button
        :class="ghostButtonClass"
        :disabled="!roomCode || roomCode.length < 6 || isLoading"
        @click="emit('join', roomCode)"
      >
        Vào
      </button>
    </div>
  </div>
</template>
