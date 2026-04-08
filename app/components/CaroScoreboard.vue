<script setup lang="ts">
import { computed } from 'vue'
import type { RoomSnapshot, Role } from '#shared/caro'

const props = defineProps<{
  snapshot: RoomSnapshot | null
  myRole: Role | null
  mySeatLabel: string
  scoreboard: Record<string, number>
  timeLeft: number
}>()

const emit = defineEmits<{
  (e: 'ready'): void
  (e: 'start'): void
}>()

const panelClass = 'rounded-[24px] border border-[rgba(179,224,193,0.12)] bg-[rgba(6,18,12,0.72)] p-5 backdrop-blur-[18px]'
const infoCardClass = 'grid rounded-xl bg-black/20 p-2.5 text-center'
const infoLabelClass = 'text-[0.7rem] uppercase opacity-60'
const playerPillBaseClass = 'rounded-full bg-white/5 px-3 py-1.5 text-[0.85rem]'
const primaryButtonClass = 'w-full rounded-xl bg-[#4aa46f] px-5 py-2.5 font-semibold text-white transition duration-200 hover:-translate-y-px hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
const ghostButtonClass = 'w-full rounded-xl border border-[rgba(179,224,193,0.12)] bg-transparent px-5 py-2.5 font-semibold text-white transition duration-200 hover:-translate-y-px hover:opacity-90'

const timerClass = computed(() => (
  props.timeLeft <= 5 ? 'animate-caro-pulse text-[#ff6b6b]' : ''
))
</script>

<template>
  <div :class="[panelClass, 'grid gap-4']">
    <div class="mb-1 grid grid-cols-3 gap-2.5">
      <article :class="infoCardClass">
        <span :class="infoLabelClass">Phòng</span>
        <strong>{{ snapshot?.code ?? '---' }}</strong>
      </article>
      <article :class="infoCardClass">
        <span :class="infoLabelClass">Của bạn</span>
        <strong>{{ mySeatLabel }}</strong>
      </article>
      <article :class="[infoCardClass, timerClass]">
        <span :class="infoLabelClass">Hẹn giờ</span>
        <strong>{{ timeLeft }}s</strong>
      </article>
    </div>

    <header>
      <div class="flex flex-wrap gap-2.5">
        <span
          v-for="player in snapshot?.players ?? []"
          :key="player.role"
          :class="[
            playerPillBaseClass,
            player.connected ? 'border border-[#4aa46f] text-[#b8f0cb]' : 'text-white'
          ]"
        >
          {{ player.role === 'host' ? 'Host' : 'Guest' }}: {{ player.name }}
          <strong class="ml-2 text-[#ffcc66]">
            {{ player.role === 'host' ? scoreboard.X : scoreboard.O }}
          </strong>
          <span
            v-if="player.ready && snapshot?.status !== 'playing'"
            class="ml-2 rounded bg-[#4aa46f] px-1.5 py-0.5 text-[0.7rem] text-white"
          >
            Sẵn sàng
          </span>
          <span
            v-if="snapshot?.status === 'playing' && snapshot.turn === (player.role === 'host' ? 'X' : 'O')"
            class="ml-2 animate-caro-pulse rounded bg-[#ffcc66] px-1.5 py-0.5 text-[0.7rem] font-bold text-caro-bg-deep"
          >
            Lượt đi
          </span>
        </span>
      </div>
    </header>

    <div v-if="snapshot?.status === 'waiting'" class="mt-2 flex justify-center">
      <button
        v-if="myRole === 'guest'"
        :class="snapshot.players.find(p => p.role === 'guest')?.ready ? ghostButtonClass : primaryButtonClass"
        @click="emit('ready')"
      >
        {{ snapshot.players.find(p => p.role === 'guest')?.ready ? 'Hủy sẵn sàng' : 'Sẵn sàng' }}
      </button>

      <button
        v-if="myRole === 'host'"
        :class="primaryButtonClass"
        :disabled="!snapshot.players.find(p => p.role === 'guest')?.ready"
        @click="emit('start')"
      >
        Bắt đầu ván đấu
      </button>
    </div>
  </div>
</template>
