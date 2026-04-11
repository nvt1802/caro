<script setup lang="ts">
export interface GameOption {
  id: "caro" | "chess" | "xiangqi";
  name: string;
  icon: string;
  description: string;
}

const props = defineProps<{
  modelValue: "caro" | "chess" | "xiangqi";
  games: readonly GameOption[];
}>();

defineEmits<{
  "update:modelValue": [id: "caro" | "chess" | "xiangqi"];
}>();
</script>

<template>
  <div class="grid grid-cols-1 gap-3">
    <label
      class="text-[0.7rem] uppercase tracking-wider text-[rgba(231,243,235,0.5)] mb-1 block"
      >Chọn trò chơi</label
    >
    <div
      v-for="game in games"
      :key="game.id"
      :class="[
        'relative flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer group overflow-visible',
        modelValue === game.id
          ? 'border-caro-accent bg-caro-accent/10'
          : 'border-[rgba(179,224,193,0.08)] bg-white/5 hover:bg-white/10 hover:border-white/20',
      ]"
      @click="$emit('update:modelValue', game.id)"
    >
      <div
        :class="[
          'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
          modelValue === game.id
            ? 'bg-caro-accent text-caro-bg-deep'
            : 'bg-white/5 text-caro-accent group-hover:bg-caro-accent/20',
        ]"
      >
        <Icon :name="game.icon" size="24" />
      </div>
      <div class="flex-1">
        <p class="font-bold text-sm text-white">{{ game.name }}</p>
        <p class="text-[0.7rem] text-[rgba(231,243,235,0.5)] truncate">
          {{ game.description }}
        </p>
      </div>
      <div
        v-if="modelValue === game.id"
        class="absolute -right-2 -bottom-2 w-8 h-8 rounded-full bg-caro-accent flex items-center justify-center shadow-lg"
      >
        <Icon name="mdi:check" class="text-caro-bg-deep text-lg" />
      </div>
    </div>
  </div>
</template>
