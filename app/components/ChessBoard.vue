<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { CustomChess, type Move } from "~~/shared/chess-engine";
import { type RoomSnapshot, type Mark } from "~~/shared/game";

const props = defineProps<{
  snapshot: RoomSnapshot;
  myMark: Mark | null;
  isLoading: boolean;
}>();

const emit = defineEmits(["move"]);

const game = ref(
  new CustomChess(
    typeof props.snapshot.board === "string" ? props.snapshot.board : undefined,
  ),
);
const selectedSquare = ref<string | null>(null);
const possibleMoves = ref<Move[]>([]);

// Sync internal game state with snapshot
watch(
  () => props.snapshot.board,
  (newFen) => {
    if (typeof newFen === "string" && newFen !== game.value.fen()) {
      game.value = new CustomChess(newFen);
      selectedSquare.value = null;
      possibleMoves.value = [];
    }
  },
  { immediate: true },
);

const board = computed(() => {
  const b = game.value.board();
  return props.myMark === "O"
    ? [...b].reverse().map((row) => [...row].reverse())
    : b;
});

const files = computed(() =>
  props.myMark === "O"
    ? ["h", "g", "f", "e", "d", "c", "b", "a"]
    : ["a", "b", "c", "d", "e", "f", "g", "h"],
);
const ranks = computed(() =>
  props.myMark === "O" ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1],
);

const getSquareName = (rowIdx: number, colIdx: number) => {
  return files.value[colIdx]! + ranks.value[rowIdx]!;
};

const handleSquareClick = (square: string) => {
  if (
    props.snapshot.status !== "playing" ||
    props.snapshot.turn !== props.myMark
  )
    return;

  if (selectedSquare.value === square) {
    selectedSquare.value = null;
    possibleMoves.value = [];
    return;
  }

  // If a square is already selected, try to move
  if (selectedSquare.value) {
    const move = possibleMoves.value.find((m) => m.to === square);
    if (move) {
      emit("move", move.lan);
      selectedSquare.value = null;
      possibleMoves.value = [];
      return;
    }
  }

  // Select piece
  const piece = game.value.get(square as any);
  if (piece && piece.color === (props.myMark === "X" ? "w" : "b")) {
    selectedSquare.value = square;
    possibleMoves.value = game.value.moves({ square: square });
  } else {
    selectedSquare.value = null;
    possibleMoves.value = [];
  }
};

const isPossibleMove = (square: string) =>
  possibleMoves.value.some((m) => m.to === square);
const lastMoveFrom = computed(() => {
  const lm = props.snapshot.lastMove;
  return typeof lm === "string" ? lm.substring(0, 2) : undefined;
});
const lastMoveTo = computed(() => {
  const lm = props.snapshot.lastMove;
  return typeof lm === "string" ? lm.substring(2, 4) : undefined;
});
</script>

<template>
  <div class="chess-container select-none">
    <div
      class="relative aspect-square w-full max-w-[600px] mx-auto rounded-xl overflow-hidden border-4 border-white/10 shadow-2xl bg-[rgba(6,18,12,0.8)] backdrop-blur-xl p-6"
    >
      <!-- Coordinate Labels (Ranks) -->
      <div
        class="absolute left-2 top-0 bottom-0 flex flex-col justify-around text-[11px] font-bold text-white/40 pointer-events-none"
      >
        <span v-for="rank in ranks" :key="rank">{{ rank }}</span>
      </div>

      <!-- Coordinate Labels (Files) -->
      <div
        class="absolute bottom-2 left-0 right-0 flex justify-around text-[11px] font-bold text-white/40 pointer-events-none px-10"
      >
        <span v-for="file in files" :key="file">{{ file }}</span>
      </div>

      <!-- Board Grid -->
      <div
        class="grid grid-cols-8 grid-rows-8 w-full h-full rounded-sm overflow-hidden shadow-lg ring-1 ring-white/10"
      >
        <template v-for="(row, rowIdx) in board" :key="rowIdx">
          <div
            v-for="(cell, colIdx) in row"
            :key="colIdx"
            :class="[
              'relative flex items-center justify-center cursor-pointer transition-all duration-300',
              (rowIdx + colIdx) % 2 === 0
                ? 'bg-[#f2e2c4] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]'
                : 'bg-[#ac7e5c] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.1)]',
              selectedSquare === getSquareName(rowIdx, colIdx)
                ? 'bg-[#98b275]/60 shadow-inner'
                : '',
              lastMoveFrom === getSquareName(rowIdx, colIdx) ||
              lastMoveTo === getSquareName(rowIdx, colIdx)
                ? 'bg-yellow-400/30'
                : '',
            ]"
            @click="handleSquareClick(getSquareName(rowIdx, colIdx))"
          >
            <!-- Valid Move Indicator -->
            <div
              v-if="isPossibleMove(getSquareName(rowIdx, colIdx))"
              class="absolute z-10 w-4 h-4 rounded-full"
              :class="
                cell
                  ? 'border-[3px] border-caro-accent/40 w-10 h-10'
                  : 'bg-caro-accent/40 w-3 h-3'
              "
            ></div>

            <!-- Piece -->
            <div
              v-if="cell"
              class="w-[85%] h-[85%] flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 z-20"
            >
              <svg
                viewBox="0 0 45 45"
                class="w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]"
              >
                <defs>
                  <!-- Wood Gradient (Light Piece) -->
                  <linearGradient
                    :id="'woodGrad' + rowIdx + colIdx"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop
                      offset="0%"
                      style="stop-color: #fdf5e6; stop-opacity: 1"
                    />
                    <stop
                      offset="50%"
                      style="stop-color: #d2b48c; stop-opacity: 1"
                    />
                    <stop
                      offset="100%"
                      style="stop-color: #8b4513; stop-opacity: 1"
                    />
                  </linearGradient>
                  <!-- Charcoal Gradient (Dark Piece) -->
                  <linearGradient
                    :id="'charcGrad' + rowIdx + colIdx"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop
                      offset="0%"
                      style="stop-color: #555555; stop-opacity: 1"
                    />
                    <stop
                      offset="50%"
                      style="stop-color: #222222; stop-opacity: 1"
                    />
                    <stop
                      offset="100%"
                      style="stop-color: #000000; stop-opacity: 1"
                    />
                  </linearGradient>
                  <!-- Glossy Overlay -->
                  <radialGradient
                    :id="'gloss' + rowIdx + colIdx"
                    cx="30%"
                    cy="30%"
                    r="50%"
                    fx="30%"
                    fy="30%"
                  >
                    <stop
                      offset="0%"
                      style="stop-color: white; stop-opacity: 0.3"
                    />
                    <stop
                      offset="100%"
                      style="stop-color: white; stop-opacity: 0"
                    />
                  </radialGradient>
                </defs>

                <g
                  fill-rule="evenodd"
                  stroke-width="1"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  :style="{
                    stroke: cell.color === 'w' ? '#5d403788' : '#00000088',
                    fill:
                      cell.color === 'w'
                        ? `url(#woodGrad${rowIdx}${colIdx})`
                        : `url(#charcGrad${rowIdx}${colIdx})`,
                  }"
                >
                  <!-- Detailed Piece Designs -->
                  <template v-if="cell.type === 'k'">
                    <path
                      d="M22.5 39c5 2.5 15.5 2.5 20.5 0v-7s9-4 6-10c-4-1-1-4-1-4s2-5-2-5-7 2-7 2-4-7-8-7-8 7-8 7-7-2-7-2-2 5-2 5-3 3-1 4c-3 6 6 10 6 10v7z"
                      transform="translate(-1, 0)"
                    />
                    <path
                      d="M22.5 30c5-2.5 15.5-2.5 20.5 0"
                      fill="none"
                      transform="translate(-1, 0)"
                    />
                    <path
                      d="M22.5 12V6M20 8h5"
                      stroke-width="2"
                      transform="translate(-1, 0)"
                    />
                    <rect
                      x="18"
                      y="32"
                      width="9"
                      height="3"
                      rx="1.5"
                      fill="rgba(0,0,0,0.1)"
                    />
                  </template>

                  <template v-else-if="cell.type === 'q'">
                    <path
                      d="M9 26c0 2 1.5 2 2 5 2 1 4 2 11 2s9-1 11-2c.5-3 2-3 2-5-4 0-7-4-8-12-1 0-2 1-3 1-3.5 0-6-3-6-3s-2.5 3-6 3c-1 0-2-1-3-1-1 8-4 12-8 12z"
                    />
                    <circle cx="6" cy="12" r="2" />
                    <circle cx="39" cy="12" r="2" />
                    <circle cx="22.5" cy="9" r="2" />
                    <circle cx="14" cy="10" r="2" />
                    <circle cx="31" cy="10" r="2" />
                    <path
                      d="M11.5 30c3.5 1 10.5 1 14 0 2-1 5-2 5-6"
                      fill="none"
                    />
                  </template>

                  <template v-else-if="cell.type === 'r'">
                    <path
                      d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zm18-4V15H15v17h15zM12 15V9h21v6H12z"
                    />
                    <path d="M15 9v3M22.5 9v3M30 9v3" stroke-width="2" />
                  </template>

                  <template v-else-if="cell.type === 'b'">
                    <path
                      d="M9 36c3 0 6 0 10 0 0-2 0-4-1.5-7.5-1.5-3.5-3.5-5-3.5-10.5 0-4.5 2.5-8 6-8s6 3.5 6 8c0 5.5-2 7-3.5 10.5-1.5 3.5-1.5 5.5-1.5 7.5 3 0 6 0 10 0-1.5 2.5-1.5 4-1.5 4.5 0 .5.5 1-2 1h-23c-2.5 0-2-.5-2-1 0-.5 0-2-1.5-4.5z"
                    />
                    <path
                      d="M17.5 12l10 10"
                      stroke="rgba(0,0,0,0.2)"
                      stroke-width="1.5"
                    />
                  </template>

                  <template v-else-if="cell.type === 'n'">
                    <path
                      d="M22 10c1 0 2 1 2 2 2.5 0 5 2.5 5 6 0 5.5-2 12-3 15-7.5 0-15 0-15-2 0-3.5-1-7-1-10 0-3.5 2.5-6 5-6 1 0 2-1 2-2 0-3.5-1-7-1-7h1c0 0 1 3.5 1 7z"
                    />
                    <path
                      d="M14 18s3-1 3-5M24 18c.3 0 .5.2.5.5s-.2.5-.5.5-.5-.2-.5-.5.2-.5.5-.5z"
                      :fill="cell.color === 'w' ? '#4a3222' : '#fff'"
                    />
                  </template>

                  <template v-else-if="cell.type === 'p'">
                    <path
                      d="M22 9c-2.2 0-4 1.8-4 4 0 .9.3 1.7.8 2.4C17.3 16.5 16 18.6 16 21c0 2 .9 3.8 2.4 5-3 1.1-7.4 5.6-7.4 12h22c0-6.4-4.4-10.9-7.4-12 1.5-1.2 2.4-3 2.4-5 0-2.4-1.3-4.5-2.8-5.6.5-.7.8-1.5.8-2.4 0-2.2-1.8-4-4-4z"
                    />
                    <ellipse
                      cx="22"
                      cy="13"
                      rx="2.5"
                      ry="2.5"
                      :fill="`url(#gloss${rowIdx}${colIdx})`"
                    />
                  </template>
                </g>
                <!-- Universal gloss overlay -->
                <ellipse
                  cx="18"
                  cy="18"
                  rx="8"
                  ry="4"
                  stroke="none"
                  :fill="`url(#gloss${rowIdx}${colIdx})`"
                  transform="rotate(-45 18 18)"
                />
              </svg>
            </div>
          </div>
        </template>
      </div>

      <!-- Turn Indicator Overlay -->
      <!-- <div
        v-if="snapshot.status === 'playing'"
        class="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-caro-accent text-caro-bg-deep text-xs font-bold shadow-lg uppercase tracking-widest z-30 transition-all border-b-2 border-black/20"
      >
        {{ snapshot.turn === "X" ? "Lượt quân Trắng" : "Lượt quân Đen" }}
      </div> -->

      <!-- Loading Overlay -->
      <div
        v-if="isLoading"
        class="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-40"
      >
        <Icon
          name="svg-spinners:ring-resize"
          size="48"
          class="text-caro-accent"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.chess-container {
  perspective: 1000px;
}
</style>
