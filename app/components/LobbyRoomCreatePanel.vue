<script setup lang="ts">
import type { GameOption } from "./LobbyGameSelection.vue";

const props = defineProps<{
  isLoading: boolean;
  games: readonly GameOption[];
}>();

const emit = defineEmits<{
  create: [isAi: boolean, selectedGame: "caro" | "chess" | "xiangqi"];
}>();

const roomNameInput = defineModel<string>("roomName", { default: "" });
const roomPasswordInput = defineModel<string>("roomPassword", { default: "" });
const isAi = defineModel<boolean>("isAi", { default: false });
const selectedGame = defineModel<"caro" | "chess" | "xiangqi">("selectedGame", {
  default: "caro",
});

const panelClass =
  "rounded-[24px] border border-[rgba(179,224,193,0.12)] bg-[rgba(6,18,12,0.72)] p-6 backdrop-blur-[18px]";
const inputClass =
  "w-full rounded-xl border border-[rgba(179,224,193,0.12)] bg-[rgba(12,25,18,0.8)] px-4 py-3 text-white outline-none transition focus:border-caro-accent";
const primaryButtonClass =
  "rounded-xl bg-caro-accent px-6 py-3 font-bold text-caro-bg-deep transition duration-200 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(116,181,134,0.3)]";
</script>

<template>
  <div :class="panelClass">
    <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
      <Icon name="mdi:plus-circle" class="text-caro-accent" />
      Tạo phòng mới
    </h3>

    <LobbyGameSelection v-model="selectedGame" :games="games" class="mb-6" />

    <div class="space-y-3 mb-6">
      <div>
        <label
          class="text-[0.7rem] uppercase tracking-wider text-[rgba(231,243,235,0.5)] mb-1 block"
          >Tên phòng (tùy chọn)</label
        >
        <input
          v-model="roomNameInput"
          :class="inputClass"
          placeholder="VD: Quyết chiến cao thủ..."
        />
      </div>
      <div>
        <label
          class="text-[0.7rem] uppercase tracking-wider text-[rgba(231,243,235,0.5)] mb-1 block"
          >Mật khẩu (để trống nếu muốn phòng công khai)</label
        >
        <input
          v-model="roomPasswordInput"
          type="password"
          :class="inputClass"
          placeholder="Nhập mật khẩu..."
        />
      </div>
      <div
        class="flex items-center gap-3 py-2 cursor-pointer group"
        @click="isAi = !isAi"
      >
        <div
          :class="[
            'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all',
            isAi
              ? 'bg-caro-accent border-caro-accent'
              : 'border-[rgba(179,224,193,0.12)] bg-white/5 group-hover:border-caro-accent/50',
          ]"
        >
          <Icon
            v-if="isAi"
            name="mdi:check"
            class="text-caro-bg-deep text-lg font-bold"
          />
        </div>
        <span
          class="text-sm font-medium text-[rgba(231,243,235,0.8)] group-hover:text-white transition-colors"
          >Chơi với máy (AI Mode)</span
        >
      </div>
    </div>

    <button
      :class="[
        primaryButtonClass,
        'w-full flex items-center justify-center gap-2',
      ]"
      :disabled="isLoading"
      @click="emit('create', isAi, selectedGame)"
    >
      <span>Bắt đầu phòng mới</span>
    </button>
  </div>
</template>
