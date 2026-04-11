// shared/xiangqi-engine.ts

export type PieceColor = 'w' | 'b' | 'r'; // Red usually uses 'w' or 'r' in FENs. We'll use 'w' for Red (White side) and 'b' for Black to align with generic logic if needed. FEN uses 'w'.
// standard piece notation:
// Red (w): R (Rook/Xe), N (Knight/Mã), B (Bishop/Tượng), A (Advisor/Sĩ), K (King/Tướng), C (Cannon/Pháo), P (Pawn/Tốt)
// Black (b): r, n, b, a, k, c, p
export type PieceType = 'r' | 'n' | 'b' | 'a' | 'k' | 'c' | 'p';

export interface Piece {
  color: PieceColor;
  type: PieceType;
}

export interface XiangqiMove {
  from: string; // e.g. "a0", "e3" - standard coordinate a-i, 0-9. Wait! Files are a-i. Ranks are 0-9.
  to: string;   // a0 is bottom-left from Red's perspective. FEN is 9...0. Let's use row, col.
}

// 0-based indexing: row 0 is top (Black side), row 9 is bottom (Red side).
// col 0 is left (Black's right, Red's left). col 8 is right.
export interface Move {
  from: { row: number; col: number };
  to: { row: number; col: number };
}

export const INITIAL_XIANGQI_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1';

export class XiangqiEngine {
  public board: (Piece | null)[][];
  public turn: PieceColor;

  constructor(fen: string = INITIAL_XIANGQI_FEN) {
    this.board = Array(10).fill(null).map(() => Array(9).fill(null));
    this.turn = 'w';
    this.loadFEN(fen);
  }

  public loadFEN(fen: string) {
    if (!fen || typeof fen !== 'string') fen = INITIAL_XIANGQI_FEN;
    const parts = fen.split(' ');
    const ranks = parts[0]?.split('/') || [];
    
    for (let row = 0; row < 10; row++) {
      if (!ranks[row]) break;
      let col = 0;
      for (const char of ranks[row]) {
        if (/[1-9]/.test(char)) {
          col += parseInt(char, 10);
        } else {
          const color: PieceColor = char === char.toUpperCase() ? 'w' : 'b';
          const type = char.toLowerCase() as PieceType;
          this.board[row][col] = { color, type };
          col++;
        }
      }
    }
    this.turn = parts[1] === 'b' ? 'b' : 'w';
  }

  public generateFEN(): string {
    let fen = '';
    for (let row = 0; row < 10; row++) {
      let emptyCount = 0;
      for (let col = 0; col < 9; col++) {
        const piece = this.board[row][col];
        if (!piece) {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            fen += emptyCount.toString();
            emptyCount = 0;
          }
          fen += piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
        }
      }
      if (emptyCount > 0) fen += emptyCount.toString();
      if (row < 9) fen += '/';
    }
    fen += ` ${this.turn} - - 0 1`; // Simplify the rest for now
    return fen;
  }

  // Generate pseudo-legal moves for a specific piece
  private getPieceMoves(r: number, c: number): Move[] {
    const piece = this.board[r][c];
    if (!piece) return [];
    const moves: Move[] = [];
    const color = piece.color;
    
    // Bounds check helper
    const inBounds = (row: number, col: number) => row >= 0 && row < 10 && col >= 0 && col < 9;
    
    // Palace check helper
    const inPalace = (row: number, col: number, pColor: PieceColor) => {
      const rowValid = pColor === 'w' ? (row >= 7 && row <= 9) : (row >= 0 && row <= 2);
      const colValid = col >= 3 && col <= 5;
      return rowValid && colValid;
    };

    // Capture check helper
    const addIfValid = (targetR: number, targetC: number) => {
      if (!inBounds(targetR, targetC)) return false;
      const targetPiece = this.board[targetR][targetC];
      if (targetPiece?.color === color) return false;
      moves.push({ from: { row: r, col: c }, to: { row: targetR, col: targetC } });
      return true; // true if it was an empty square or capture (can't go further if capture, handled differently for sliders)
    };

    switch (piece.type) {
      case 'k': { // King / Tướng
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dr, dc] of dirs) {
          const nr = r + dr, nc = c + dc;
          if (inPalace(nr, nc, color)) addIfValid(nr, nc);
        }
        break;
      }
      case 'a': { // Advisor / Sĩ
        const dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        for (const [dr, dc] of dirs) {
          const nr = r + dr, nc = c + dc;
          if (inPalace(nr, nc, color)) addIfValid(nr, nc);
        }
        break;
      }
      case 'b': { // Bishop/Elephant / Tượng
        const dirs = [[2, 2], [2, -2], [-2, 2], [-2, -2]];
        for (const [dr, dc] of dirs) {
          const nr = r + dr, nc = c + dc;
          // Must stay on their half of the board
          const halfValid = color === 'w' ? (nr >= 5 && nr <= 9) : (nr >= 0 && nr <= 4);
          if (halfValid && inBounds(nr, nc)) {
            // Check for blocking piece (eye of elephant)
            const eyeR = r + dr / 2;
            const eyeC = c + dc / 2;
            if (!this.board[eyeR][eyeC]) addIfValid(nr, nc);
          }
        }
        break;
      }
      case 'n': { // Knight / Mã
        const dirs = [
          [[-1, -2], [0, -1]], [[1, -2], [0, -1]], // move left
          [[-1, 2], [0, 1]], [[1, 2], [0, 1]],   // move right
          [[-2, -1], [-1, 0]], [[-2, 1], [-1, 0]], // move up
          [[2, -1], [1, 0]], [[2, 1], [1, 0]]    // move down
        ];
        for (const [[dr, dc], [br, bc]] of dirs) {
          const nr = r + dr, nc = c + dc;
          const blockR = r + br, blockC = c + bc;
          if (inBounds(nr, nc) && inBounds(blockR, blockC) && !this.board[blockR][blockC]) {
            addIfValid(nr, nc);
          }
        }
        break;
      }
      case 'r': { // Rook / Xe
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dr, dc] of dirs) {
          let nr = r + dr, nc = c + dc;
          while (inBounds(nr, nc)) {
            const hit = this.board[nr][nc];
            if (!hit) {
              moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc } });
            } else {
              if (hit.color !== color) {
                 moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc } });
              }
              break;
            }
            nr += dr; nc += dc;
          }
        }
        break;
      }
      case 'c': { // Cannon / Pháo
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dr, dc] of dirs) {
          let nr = r + dr, nc = c + dc;
          let jumped = false;
          while (inBounds(nr, nc)) {
            const hit = this.board[nr][nc];
            if (!jumped) {
              if (!hit) {
                moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc } });
              } else {
                jumped = true;
              }
            } else {
              if (hit) {
                if (hit.color !== color) {
                  moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc } });
                }
                break;
              }
            }
            nr += dr; nc += dc;
          }
        }
        break;
      }
      case 'p': { // Pawn / Tốt
        const dr = color === 'w' ? -1 : 1;
        // Move forward
        addIfValid(r + dr, c);
        // After crossing river, can move horizontally
        const crossedRiver = color === 'w' ? (r <= 4) : (r >= 5);
        if (crossedRiver) {
          addIfValid(r, c + 1);
          addIfValid(r, c - 1);
        }
        break;
      }
    }
    return moves;
  }

  // Check if generals see each other
  private generalsSeeEachOther(): boolean {
    let k1: {row: number, col: number} | null = null;
    let k2: {row: number, col: number} | null = null;

    for (let c = 3; c <= 5; c++) {
      for (let r = 0; r <= 9; r++) {
        if (this.board[r][c]?.type === 'k') {
          if (!k1) k1 = {row: r, col: c};
          else {
            k2 = {row: r, col: c};
            break;
          }
        }
      }
      if (k1 && k2 && k1.col === k2.col) {
        let piecesBetween = 0;
        for (let r = k1.row + 1; r < k2.row; r++) {
          if (this.board[r][c]) piecesBetween++;
        }
        if (piecesBetween === 0) return true;
      }
      k1 = null; k2 = null; // Reset for next column
    }
    return false;
  }

  // Get all legal moves for current player
  public getLegalMoves(): Move[] {
    const legalMoves: Move[] = [];
    const tempBoard = this.board.map(r => [...r]);

    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = this.board[r][c];
        if (piece?.color === this.turn) {
          const pseudoMoves = this.getPieceMoves(r, c);
          for (const move of pseudoMoves) {
            // Apply move temporarily
            const captured = this.board[move.to.row][move.to.col];
            this.board[move.to.row][move.to.col] = this.board[move.from.row][move.from.col];
            this.board[move.from.row][move.from.col] = null;

            // Check if king is in check or generals face each other
            if (!this.generalsSeeEachOther() && !this.isCheck(this.turn)) {
              legalMoves.push(move);
            }

            // Revert move
            this.board[move.from.row][move.from.col] = this.board[move.to.row][move.to.col];
            this.board[move.to.row][move.to.col] = captured;
          }
        }
      }
    }
    return legalMoves;
  }

  // Check if a color is in check
  private isCheck(color: PieceColor): boolean {
    const oppColor = color === 'w' ? 'b' : 'w';
    let kingR = -1; let kingC = -1;
    // Find king
    outer: for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.board[r][c]?.type === 'k' && this.board[r][c]?.color === color) {
          kingR = r; kingC = c;
          break outer;
        }
      }
    }
    if (kingR === -1) return false; // Should not happen in valid state

    // Check if any opponent piece can attack king
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.board[r][c]?.color === oppColor) {
          const moves = this.getPieceMoves(r, c);
          // Check if any move targets kingR, kingC
          for (const move of moves) {
            if (move.to.row === kingR && move.to.col === kingC) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  public move(from: {row: number, col: number}, to: {row: number, col: number}): boolean {
    const legalMoves = this.getLegalMoves();
    const isValid = legalMoves.some(m => 
      m.from.row === from.row && m.from.col === from.col &&
      m.to.row === to.row && m.to.col === to.col
    );

    if (isValid) {
      this.board[to.row][to.col] = this.board[from.row][from.col];
      this.board[from.row][from.col] = null;
      this.turn = this.turn === 'w' ? 'b' : 'w';
      return true;
    }
    return false;
  }

  public isGameOver(): boolean {
    return this.getLegalMoves().length === 0;
  }
}
