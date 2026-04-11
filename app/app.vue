<script setup lang="ts">
import { useCaroGame } from "./composables/useCaroGame";
import AppToast from "./components/AppToast.vue";

const { toasts, isLoading, loadingCell, user, userProfile, logout } = useCaroGame();

const eyebrowClass =
  "mb-2 text-xs uppercase tracking-[0.24em] text-caro-accent font-bold";
</script>

<template>
  <main
    class="relative mx-auto min-h-screen max-w-[1440px] px-3 md:px-5 pb-10 pt-4 md:pt-8 font-caro text-caro-text"
  >
    <!-- Animated background elements -->
    <div
      class="pointer-events-none fixed -left-[10px] -top-10 h-[220px] w-[220px] rounded-full bg-[rgba(116,181,134,0.45)] opacity-[0.35] blur-[60px]"
    />
    <div
      class="pointer-events-none fixed -bottom-[40px] -right-[50px] h-[280px] w-[280px] rounded-full bg-[rgba(209,161,92,0.2)] opacity-[0.35] blur-[60px]"
    />

    <!-- Persistent Header -->
    <header
      class="mb-6 sm:mb-10 flex flex-wrap items-center justify-between gap-4 p-4 rounded-[20px] bg-white/5 border border-white/5 backdrop-blur-md shadow-lg"
    >
      <div @click="navigateTo('/')" class="flex items-center gap-3 cursor-pointer group">
        <div class="relative w-10 h-10 sm:w-12 sm:h-12 overflow-hidden rounded-xl border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-300">
          <img src="/logo.png" alt="MultiChess Logo" class="w-full h-full object-cover">
          <div class="absolute inset-0 bg-gradient-to-tr from-caro-accent/20 to-transparent"></div>
        </div>
        <h1
          class="text-xl sm:text-2xl font-black italic tracking-tighter text-white uppercase group-hover:text-caro-accent transition-colors duration-300"
        >
          Multi<span class="text-caro-accent group-hover:text-white transition-colors duration-300">Chess</span>
        </h1>
      </div>

      <nav
        class="hidden sm:flex items-center gap-6 text-sm font-bold uppercase tracking-widest text-[rgba(231,243,235,0.6)]"
      >
        <NuxtLink
          to="/"
          class="hover:text-caro-accent transition-all hover:-translate-y-0.5"
          active-class="text-caro-accent"
          >Trang chủ</NuxtLink
        >
        <NuxtLink
          to="/lobby"
          class="hover:text-caro-accent transition-all hover:-translate-y-0.5"
          active-class="text-caro-accent"
          >Sảnh chờ
        </NuxtLink>
      </nav>

      <!-- Auth Widget -->
      <div class="flex items-center gap-4 ml-auto sm:ml-0">
        <template v-if="user">
          <div class="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
            <div class="flex flex-col items-end hidden sm:flex">
              <span class="text-xs font-bold text-white leading-none">{{ userProfile?.display_name || userProfile?.username }}</span>
              <span class="text-[10px] text-caro-accent uppercase tracking-tighter">Kỳ thủ</span>
            </div>
            <button 
              @click="logout"
              class="p-2 rounded-lg hover:bg-white/10 text-[rgba(231,243,235,0.6)] hover:text-red-400 transition-colors"
              title="Đăng xuất"
            >
              <Icon name="mdi:logout" size="20" />
            </button>
          </div>
        </template>
        <template v-else>
          <NuxtLink 
            to="/login"
            class="px-5 py-2 rounded-xl bg-caro-accent font-bold text-caro-bg-deep text-sm transition-all hover:scale-105 hover:shadow-lg active:scale-95"
          >
            Đăng nhập
          </NuxtLink>
        </template>
      </div>
    </header>

    <!-- Page Content -->
    <NuxtPage />

    <AppToast :items="toasts" />

    <!-- Loading Overlay (Global) -->
    <Teleport to="body">
      <div
        v-if="isLoading && !loadingCell"
        class="fixed inset-0 z-[999] flex items-center justify-center bg-[rgba(6,18,12,0.6)] backdrop-blur-[4px]"
      >
        <div class="flex flex-col items-center gap-4">
          <div
            class="h-10 w-10 animate-spin rounded-full border-4 border-[rgba(179,224,193,0.12)] border-t-caro-accent"
          />
          <p
            class="text-sm font-medium tracking-widest text-[#b8f0cb] uppercase italic"
          >
            Đang đồng bộ...
          </p>
        </div>
      </div>
    </Teleport>
  </main>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: all 0.2s ease-out;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
