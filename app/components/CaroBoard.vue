<script setup lang="ts">
import type { RoomSnapshot, Mark } from '#shared/caro'

const props = defineProps<{
  snapshot: RoomSnapshot | null
  canPlayCell: (row: number, col: number) => boolean
}>()

const emit = defineEmits<{
  (e: 'play', row: number, col: number): void
}>()

function cellClasses(row: number, col: number, val: Mark | null) {
  const isLast = props.snapshot?.lastMove?.row === row && props.snapshot?.lastMove?.col === col
  const isWinning = props.snapshot?.winningLine.some(([r, c]) => r === row && c === col)
  const isPlayable = props.canPlayCell(row, col)

  return [
    'flex h-10 w-10 items-center justify-center rounded-md border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)] transition duration-150 disabled:cursor-not-allowed disabled:opacity-100',
    isPlayable ? 'cursor-pointer hover:border-[rgba(158,216,176,0.3)] hover:bg-[rgba(158,216,176,0.1)]' : '',
    isLast ? 'border-2 border-caro-accent' : '',
    isWinning ? 'bg-[rgba(74,164,111,0.3)]' : ''
  ]
}
</script>

<template>
  <div
    v-if="snapshot"
    class="flex justify-center rounded-[20px] border border-[rgba(179,224,193,0.12)] bg-[rgba(6,18,12,0.4)] p-2.5"
  >
    <div class="flex w-fit flex-col gap-1">
      <div v-for="(line, rIdx) in snapshot.board" :key="rIdx" class="flex gap-1">
        <button
          v-for="(cell, cIdx) in line"
          :key="cIdx"
          :class="cellClasses(rIdx, cIdx, cell)"
          :disabled="!canPlayCell(rIdx, cIdx)"
          @click="emit('play', rIdx, cIdx)"
        >
          <span
            v-if="cell"
            :class="[
              'text-[1.4rem] font-extrabold',
              cell === 'X' ? 'text-caro-x' : 'text-caro-o'
            ]"
          >
            {{ cell }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
