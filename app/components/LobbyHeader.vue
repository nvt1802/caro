<script setup lang="ts">
interface UserStat {
  game_type: string;
  wins: number;
  losses: number;
  draws: number;
}

defineProps<{
  userName: string;
  userStats?: UserStat[];
}>();

defineEmits<{
  changeName: [];
}>();

const getGameName = (type: string) => {
  switch (type) {
    case "caro":
      return "Caro";
    case "chess":
      return "Cờ Vua";
    case "xiangqi":
      return "Cờ Tướng";
    default:
      return type;
  }
};
</script>

<template>
  <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
    <div class="flex-1">
      <p
        class="mb-2 text-xs uppercase tracking-[0.24em] text-caro-accent font-bold"
      >
        Hồ Sơ Kỳ Thủ
      </p>
      <div class="relative inline-block group">
        <h1 class="text-2xl md:text-4xl font-bold text-white leading-tight">
          Chào, {{ userName }}!
        </h1>
        <button
          class="absolute -top-2 -right-6 md:-top-3 md:-right-8 flex items-center justify-center rounded-full border border-white/5 bg-white/10 p-1.5 text-caro-accent opacity-60 transition-all group-hover:opacity-100 group-hover:scale-110 active:scale-95"
          title="Đổi tên"
          @click="$emit('changeName')"
        >
          <Icon name="mdi:pencil" size="16" class="md:w-5 md:h-5" />
        </button>
      </div>
      <p class="mt-2 text-[rgba(231,243,235,0.6)]">
        Theo dõi thành tích và tiếp tục chinh phục các đỉnh cao.
      </p>
    </div>

    <!-- Stats Dashboard -->
    <div v-if="userStats && userStats.length > 0" class="flex flex-wrap gap-4">
      <div
        v-for="stat in userStats"
        :key="stat.game_type"
        class="min-w-[140px] rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-md"
      >
        <p class="text-[10px] uppercase tracking-widest text-caro-accent font-bold mb-2">{{ getGameName(stat.game_type) }}</p>
        <div class="flex items-end gap-3">
          <div class="flex flex-col">
            <span class="text-2xl font-black text-white leading-none">{{ stat.wins }}</span>
            <span class="text-[10px] text-emerald-400/70 font-bold uppercase mt-1">Wins</span>
          </div>
          <div class="flex flex-col border-l border-white/10 pl-3">
            <span class="text-sm font-bold text-white/50 leading-none">{{ stat.losses }}</span>
            <span class="text-[8px] text-white/30 uppercase mt-1">Loss</span>
          </div>
          <div v-if="stat.draws > 0" class="flex flex-col border-l border-white/10 pl-3">
            <span class="text-sm font-bold text-white/50 leading-none">{{ stat.draws }}</span>
            <span class="text-[8px] text-white/30 uppercase mt-1">Draw</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
