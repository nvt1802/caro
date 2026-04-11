// server/utils/xiangqi-ai.ts

import { XiangqiEngine, type Move, type PieceColor, type PieceType } from "~~/shared/xiangqi-engine";

// Very basic piece values for Xiangqi
const PIECE_VALUES: Record<PieceType, number> = {
  k: 20000, // Tướng (King)
  r: 900,   // Xe (Rook)
  c: 450,   // Pháo (Cannon)
  n: 400,   // Mã (Knight)
  b: 200,   // Tượng (Elephant)
  a: 200,   // Sĩ (Advisor)
  p: 100    // Tốt (Pawn)
};

// Evaluate the board
function evaluateBoard(engine: XiangqiEngine, aiColor: PieceColor): number {
  if (engine.isGameOver()) {
    if (engine.turn === aiColor) return -99999; // AI lost
    return 99999; // AI won
  }

  let score = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = engine.board[r]![c]!;
      if (piece) {
        const val = PIECE_VALUES[piece.type];
        // Bonus for pawn crossing river (simplified)
        let posBonus = 0;
        if (piece.type === 'p') {
          if (piece.color === 'w' && r <= 4) posBonus = 50;
          if (piece.color === 'b' && r >= 5) posBonus = 50;
        }

        const pieceScore = val + posBonus;
        if (piece.color === aiColor) {
          score += pieceScore;
        } else {
          score -= pieceScore;
        }
      }
    }
  }
  return score;
}

// Minimax with Alpha-Beta Pruning
function minimax(
  engine: XiangqiEngine,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizingPlayer: boolean,
  aiColor: PieceColor
): number {
  if (depth === 0 || engine.isGameOver()) {
    return evaluateBoard(engine, aiColor);
  }

  const moves = engine.getLegalMoves();
  
  // Sort moves heuristically (captures first) to improve pruning
  moves.sort((a, b) => {
    const aCap = engine.board[a.to.row]![a.to.col]!;
    const bCap = engine.board[b.to.row]![b.to.col]!;
    const aVal = aCap ? PIECE_VALUES[aCap.type] : 0;
    const bVal = bCap ? PIECE_VALUES[bCap.type] : 0;
    return bVal - aVal;
  });

  if (isMaximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of moves) {
      // Simulate move
      const captured = engine.board[move.to.row]![move.to.col]!;
      engine.board[move.to.row]![move.to.col] = engine.board[move.from.row]![move.from.col]!;
      engine.board[move.from.row]![move.from.col] = null;
      engine.turn = engine.turn === 'w' ? 'b' : 'w';

      const ev = minimax(engine, depth - 1, alpha, beta, false, aiColor);

      // Revert move
      engine.turn = engine.turn === 'w' ? 'b' : 'w';
      engine.board[move.from.row]![move.from.col] = engine.board[move.to.row]![move.to.col]!;
      engine.board[move.to.row]![move.to.col] = captured;

      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break; // Beta cutoff
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      // Simulate move
      const captured = engine.board[move.to.row]![move.to.col]!;
      engine.board[move.to.row]![move.to.col] = engine.board[move.from.row]![move.from.col]!;
      engine.board[move.from.row]![move.from.col] = null;
      engine.turn = engine.turn === 'w' ? 'b' : 'w';

      const ev = minimax(engine, depth - 1, alpha, beta, true, aiColor);

      // Revert move
      engine.turn = engine.turn === 'w' ? 'b' : 'w';
      engine.board[move.from.row]![move.from.col] = engine.board[move.to.row]![move.to.col]!;
      engine.board[move.to.row]![move.to.col] = captured;

      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break; // Alpha cutoff
    }
    return minEval;
  }
}

export function calculateXiangqiAIMove(
  fen?: string,
  depth: number = 3,
  aiColor: PieceColor = 'b'
): { from: string; to: string } | null {
  const engine = new XiangqiEngine(fen);
  
  // ensure it's ai turn
  if (engine.turn !== aiColor) return null;

  const legalMoves = engine.getLegalMoves();
  if (legalMoves.length === 0) return null;

  let bestMove: Move | null = null;
  let bestValue = -Infinity;

  legalMoves.sort((a, b) => {
    const aCap = engine.board[a.to.row]![a.to.col];
    const bCap = engine.board[b.to.row]![b.to.col];
    return (bCap ? PIECE_VALUES[bCap.type] : 0) - (aCap ? PIECE_VALUES[aCap.type] : 0);
  });

  for (const move of legalMoves) {
    const captured = engine.board[move.to.row]![move.to.col]!;
    engine.board[move.to.row]![move.to.col] = engine.board[move.from.row]![move.from.col]!;
    engine.board[move.from.row]![move.from.col] = null;
    engine.turn = engine.turn === 'w' ? 'b' : 'w';

    const boardValue = minimax(engine, depth - 1, -Infinity, Infinity, false, aiColor);

    engine.turn = engine.turn === 'w' ? 'b' : 'w';
    engine.board[move.from.row]![move.from.col] = engine.board[move.to.row]![move.to.col]!;
    engine.board[move.to.row]![move.to.col] = captured;

    // Small randomization for tie-breaking
    const randomizedValue = boardValue + Math.random() * 5;

    if (randomizedValue > bestValue) {
      bestValue = randomizedValue;
      bestMove = move;
    }
  }

  if (bestMove) {
    return {
      from: `${bestMove.from.row},${bestMove.from.col}`,
      to: `${bestMove.to.row},${bestMove.to.col}`
    };
  }

  return null;
}
