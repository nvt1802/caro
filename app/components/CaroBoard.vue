<script setup lang="ts">
import type { RoomSnapshot, Mark, Cell } from '~~/shared/game'

const props = defineProps<{
  snapshot: RoomSnapshot | null
  canPlayCell: (row: number, col: number) => boolean
  loadingCell?: { row: number; col: number } | null
}>()

const emit = defineEmits<{
  (e: 'play', row: number, col: number): void
}>()

function isCellLoading(r: number, c: number) {
  return props.loadingCell?.row === r && props.loadingCell?.col === c
}

function cellClasses(row: number, col: number, val: Cell) {
  const lm = props.snapshot?.lastMove
  const isLast = typeof lm === 'object' && lm !== null && 'row' in lm && lm.row === row && lm.col === col
  const isWinning = props.snapshot?.winningLine.some(([r, c]) => r === row && c === col)
  const isPlayable = props.canPlayCell(row, col)
  const isLoading = isCellLoading(row, col)

  return [
    'relative flex h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 items-center justify-center rounded-md border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)] transition duration-150 disabled:cursor-not-allowed disabled:opacity-100',
    isPlayable && !isLoading ? 'cursor-pointer hover:border-[rgba(158,216,176,0.3)] hover:bg-[rgba(158,216,176,0.1)]' : '',
    isLast ? 'border-2 border-caro-accent' : '',
    isWinning ? 'bg-[rgba(74,164,111,0.3)]' : '',
    isLoading ? 'opacity-70' : ''
  ]
}
</script>

<template>
  <div
    v-if="snapshot"
    class="flex justify-start sm:justify-center overflow-x-auto overflow-y-hidden rounded-[20px] border border-[rgba(179,224,193,0.12)] bg-[rgba(6,18,12,0.4)] p-2.5"
  >
    <div class="flex w-fit flex-col gap-1">
      <div v-for="(line, rIdx) in (Array.isArray(snapshot.board) ? snapshot.board : [])" :key="rIdx" class="flex gap-1">
        <button
          v-for="(cell, cIdx) in line"
          :key="cIdx"
          :class="cellClasses(rIdx, cIdx, cell)"
          :disabled="!canPlayCell(rIdx, cIdx) || isCellLoading(rIdx, cIdx)"
          @click="emit('play', rIdx, cIdx)"
        >
          <div v-if="isCellLoading(rIdx, cIdx)" class="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.1)] border-t-caro-accent" />
          <span
            v-else-if="cell"
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
