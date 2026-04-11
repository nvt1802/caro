<template>
  <div
    class="xiangqi-board-wrapper relative mx-auto select-none"
    :class="{ 'opacity-50 pointer-events-none': isLoading }"
  >
    <!-- Board -->
    <div class="xiangqi-board shadow-2xl relative">
      <!-- Background wood style -->
      <div
        class="absolute inset-0 bg-[#d8b07e] rounded border-4 border-[#8c5738]"
        style="box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.3)"
      ></div>

      <!-- Grid Lines Container - Needs padding so pieces sit on intersections -->
      <div class="absolute inset-4 sm:inset-6 flex flex-col justify-between">
        <!-- SVG Overlays for precise lines -->
        <svg
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          viewBox="0 0 800 900"
          class="absolute inset-0 pointer-events-none"
        >
          <g stroke="#5e3923" stroke-width="4" stroke-linecap="round">
            <!-- Vertical Lines -->
            <line
              v-for="c in 9"
              :key="'v1' + c"
              :x1="(c - 1) * 100"
              :y1="0"
              :x2="(c - 1) * 100"
              :y2="400"
            />
            <line
              v-for="c in 9"
              :key="'v2' + c"
              :x1="(c - 1) * 100"
              :y1="500"
              :x2="(c - 1) * 100"
              :y2="900"
            />
            <line x1="0" y1="400" x2="0" y2="500" />
            <!-- River borders -->
            <line x1="800" y1="400" x2="800" y2="500" />

            <!-- Horizontal Lines -->
            <line
              v-for="r in 10"
              :key="'h' + r"
              :x1="0"
              :y1="(r - 1) * 100"
              :x2="800"
              :y2="(r - 1) * 100"
            />

            <!-- Palaces -->
            <!-- Top Palace -->
            <line x1="300" y1="0" x2="500" y2="200" />
            <line x1="500" y1="0" x2="300" y2="200" />
            <!-- Bottom Palace -->
            <line x1="300" y1="700" x2="500" y2="900" />
            <line x1="500" y1="700" x2="300" y2="900" />
          </g>

          <!-- River Text -->
          <text
            x="200"
            y="470"
            font-family="'Kaiti', serif"
            font-size="50"
            fill="#5e3923"
            text-anchor="middle"
            transform="rotate(-90 200 450)"
          >
            楚河
          </text>
          <text
            x="600"
            y="470"
            font-family="'Kaiti', serif"
            font-size="50"
            fill="#5e3923"
            text-anchor="middle"
            transform="rotate(90 600 450)"
          >
            漢界
          </text>

          <!-- Star Marks for Pawns & Cannons -->
          <g stroke="#5e3923" stroke-width="2" fill="none">
            <!-- Helper to draw a cross at an intersection index -->
            <!-- Cannons -->
            <path d="M 90,210 L 110,210 M 100,200 L 100,220 M 690,210 L 710,210 M 700,200 L 700,220" />
            <path d="M 90,690 L 110,690 M 100,680 L 100,700 M 690,690 L 710,690 M 700,680 L 700,700" />
            
            <!-- Pawns -->
            <path d="M -10,310 L 10,310 M 0,300 L 0,320" /> <!-- Corner cross? No, just center -->
            <path d="M 190,310 L 210,310 M 200,300 L 200,320" />
            <path d="M 390,310 L 410,310 M 400,300 L 400,320" />
            <path d="M 590,310 L 610,310 M 600,300 L 600,320" />
            <path d="M 790,310 L 810,310 M 800,300 L 800,320" />

            <path d="M -10,590 L 10,590 M 0,580 L 0,600" />
            <path d="M 190,590 L 210,590 M 200,580 L 200,600" />
            <path d="M 390,590 L 410,590 M 400,580 L 400,600" />
            <path d="M 590,590 L 610,590 M 600,580 L 600,600" />
            <path d="M 790,590 L 810,590 M 800,580 L 800,600" />
          </g>
        </svg>

        <!-- Interactive Grid (10x9) -->
        <div
          class="grid h-full w-full relative z-10"
          style="
            grid-template-rows: repeat(10, minmax(0, 1fr));
            grid-template-columns: repeat(9, minmax(0, 1fr));
          "
        >
          <template v-for="r in 10" :key="'row' + r">
            <div
              v-for="c in 9"
              :key="'col' + c"
              class="relative flex items-center justify-center cursor-pointer h-full w-full"
              @click="handleSquareClick(r - 1, c - 1)"
              @dragover.prevent
              @drop="handleDrop($event, r - 1, c - 1)"
            >
              <!-- Indicator for movable/capturable -->
              <div
                v-if="isValidMoveTarget(r - 1, c - 1)"
                class="absolute h-1/3 w-1/3 rounded-full z-20 pointer-events-none"
                :class="
                  hasPiece(r - 1, c - 1) ? 'bg-red-500/50' : 'bg-black/20'
                "
              ></div>

              <!-- Last move highlight -->
              <div
                v-if="isLastMoveMatch(r - 1, c - 1)"
                class="absolute h-full w-full bg-caro-accent/30 z-10"
              ></div>

              <!-- Selected square highlight -->
              <div
                v-if="
                  selectedSquare?.row === r - 1 && selectedSquare?.col === c - 1
                "
                class="absolute h-full w-full bg-yellow-500/40 z-10"
              ></div>

              <!-- Piece -->
              <div
                v-if="getPiece(r - 1, c - 1)"
                class="piece-container absolute inset-0 sm:inset-1 p-0.5 z-30 flex items-center justify-center transition-transform hover:scale-105"
                :draggable="isMyPiece(r - 1, c - 1)"
                @dragstart="handleDragStart($event, r - 1, c - 1)"
              >
                <XiangqiPieceSVG :piece="getPiece(r - 1, c - 1)!" />
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import {
  XiangqiEngine,
  type Move,
  type PieceColor,
  type Piece,
} from "~~/shared/xiangqi-engine";
import type { RoomSnapshot } from "~~/shared/game";
import XiangqiPieceSVG from "./XiangqiPieceSVG.vue";

const props = defineProps<{
  snapshot: RoomSnapshot;
  myMark: string | null; // 'X' is Red (w), 'O' is Black (b), 'spectator' or null
  isLoading: boolean;
}>();

const emit = defineEmits<{
  move: [moveStr: string];
}>();

const engine = ref(new XiangqiEngine());
const selectedSquare = ref<{ row: number; col: number } | null>(null);
const legalMoves = ref<Move[]>([]);

const myColor = computed<PieceColor | null>(() => {
  if (props.myMark === "X") return "w";
  if (props.myMark === "O") return "b";
  return null;
});

// Sync snapshot to engine
watch(
  () => props.snapshot.board,
  (newBoard) => {
    if (typeof newBoard === "string" && newBoard.length > 5) {
      if (engine.value.generateFEN() !== newBoard) {
        engine.value.loadFEN(newBoard);
        engine.value.turn = props.snapshot.turn === "X" ? "w" : "b";
      }
    } else if (
      !newBoard ||
      (Array.isArray(newBoard) && newBoard.length === 0)
    ) {
      // initial state
      engine.value.loadFEN(
        "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1",
      );
    }
  },
  { immediate: true },
);

const getPiece = (r: number, c: number) => engine.value.board[r]?.[c];

const hasPiece = (r: number, c: number) => !!getPiece(r, c);

const isMyPiece = (r: number, c: number) => {
  const p = getPiece(r, c);
  return !!(p && p.color === myColor.value && p.color === engine.value.turn);
};

const isLastMoveMatch = (r: number, c: number) => {
  // Parsing lastMove not implemented strictly, let's keep it simple or implement decoding later
  return false;
};

const isValidMoveTarget = (r: number, c: number) => {
  if (!selectedSquare.value) return false;
  return legalMoves.value.some(
    (m) =>
      m.from.row === selectedSquare.value!.row &&
      m.from.col === selectedSquare.value!.col &&
      m.to.row === r &&
      m.to.col === c,
  );
};

function handleSquareClick(r: number, c: number) {
  if (props.isLoading || props.snapshot.status !== "playing") return;

  if (selectedSquare.value) {
    if (isValidMoveTarget(r, c)) {
      movePiece(selectedSquare.value, { row: r, col: c });
      return;
    }
  }

  // Select a new piece
  if (isMyPiece(r, c)) {
    selectedSquare.value = { row: r, col: c };
    updateLegalMoves();
  } else {
    selectedSquare.value = null;
    legalMoves.value = [];
  }
}

function updateLegalMoves() {
  legalMoves.value = engine.value.getLegalMoves();
}

function movePiece(
  from: { row: number; col: number },
  to: { row: number; col: number },
) {
  selectedSquare.value = null;
  legalMoves.value = [];
  const moveStr = `${from.row},${from.col}-${to.row},${to.col}`;

  // Local optimistic update
  engine.value.move(from, to);

  emit("move", moveStr);
}

function handleDragStart(event: DragEvent, r: number, c: number) {
  if (
    props.isLoading ||
    props.snapshot.status !== "playing" ||
    !isMyPiece(r, c)
  ) {
    event.preventDefault();
    return;
  }
  selectedSquare.value = { row: r, col: c };
  updateLegalMoves();
  event.dataTransfer?.setData("text/plain", JSON.stringify({ r, c }));
}

function handleDrop(event: DragEvent, r: number, c: number) {
  const data = event.dataTransfer?.getData("text/plain");
  if (!data) return;

  try {
    const from = JSON.parse(data);
    if (isValidMoveTarget(r, c)) {
      movePiece({ row: from.r, col: from.c }, { row: r, col: c });
    } else {
      selectedSquare.value = null;
      legalMoves.value = [];
    }
  } catch (e) {
    // Ignore error
  }
}
</script>

<style scoped>
.xiangqi-board-wrapper {
  max-width: 600px;
  width: 100%;
}
.xiangqi-board {
  width: 100%;
  padding-bottom: 111.11%; /* Aspect ratio ~ 10/9 */
}
</style>
