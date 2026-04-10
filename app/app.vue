<script setup lang="ts">
import { useCaroGame } from "./composables/useCaroGame";
import AppToast from "./components/AppToast.vue";

const { toasts, isLoading, loadingCell } = useCaroGame();

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

    <!-- Simple Persistent Header -->
    <header
      class="mb-6 sm:mb-10 flex flex-wrap items-center justify-between gap-4"
    >
      <div @click="navigateTo('/')" class="cursor-pointer">
        <h1
          class="text-xl sm:text-2xl font-black italic tracking-tighter text-white uppercase"
        >
          Caro<span class="text-caro-accent">Online</span>
        </h1>
      </div>

      <nav
        class="hidden sm:flex gap-6 text-sm font-bold uppercase tracking-widest text-[rgba(231,243,235,0.6)]"
      >
        <NuxtLink
          to="/"
          class="hover:text-caro-accent transition"
          active-class="text-caro-accent"
          >Trang chủ</NuxtLink
        >
        <NuxtLink
          to="/lobby"
          class="hover:text-caro-accent transition"
          active-class="text-caro-accent"
          >Sảnh chờ
        </NuxtLink>
      </nav>
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
