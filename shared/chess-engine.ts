export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type Color = "w" | "b";

export interface Piece {
  type: PieceType;
  color: Color;
}

export interface Move {
  color: Color;
  piece: PieceType;
  from: string;
  to: string;
  captured?: PieceType;
  promotion?: PieceType;
  flags: string;
  lan: string;
}

interface CastlingRights {
  w: { k: boolean; q: boolean };
  b: { k: boolean; q: boolean };
}

interface GameStateRecord {
  board: (Piece | null)[][];
  turn: Color;
  castlingRights: CastlingRights;
  enPassantTarget: string | null;
  halfMoves: number;
  fullMoves: number;
}

const CORRECT_INITIAL_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export class CustomChess {
  private _board: (Piece | null)[][] = [];
  private _turn: Color = "w";
  private _castlingRights: CastlingRights = {
    w: { k: true, q: true },
    b: { k: true, q: true },
  };
  private _enPassantTarget: string | null = null;
  private _halfMoves: number = 0;
  private _fullMoves: number = 1;

  private _history: GameStateRecord[] = [];

  constructor(fen: string = CORRECT_INITIAL_FEN) {
    this.load(fen);
  }

  // ==== UTILS ====
  private cloneBoard(): (Piece | null)[][] {
    return this._board.map((r) => r.map((c) => (c ? { ...c } : null)));
  }

  private saveState(): GameStateRecord {
    return {
      board: this.cloneBoard(),
      turn: this._turn,
      castlingRights: {
        w: { ...this._castlingRights.w },
        b: { ...this._castlingRights.b },
      },
      enPassantTarget: this._enPassantTarget,
      halfMoves: this._halfMoves,
      fullMoves: this._fullMoves,
    };
  }

  public get(square: string): Piece | null {
    const { r, c } = this.sqToRc(square);
    if (r < 0 || r > 7 || c < 0 || c > 7) return null;
    return this._board[r]![c]!;
  }

  public board(): (Piece | null)[][] {
    return this._board; // Readonly reference intended internally, but vue will use it
  }

  public turn(): Color {
    return this._turn;
  }

  // ==== FEN PARSING & GEN ====
  public load(fen: string): boolean {
    if (!fen) return false;
    const tokens = fen.split(" ");
    if (!tokens || tokens.length < 4) return false;

    const [placement, turn, castling, ep, half, full] = tokens;

    // Parse placement
    const rows = placement!.split("/");
    if (rows.length !== 8) return false;

    const newBoard: (Piece | null)[][] = [];
    for (let i = 0; i < 8; i++) {
      const row: (Piece | null)[] = [];
      for (const char of rows[i]!) {
        if (/[1-8]/.test(char)) {
          const emptyCount = parseInt(char, 10);
          for (let e = 0; e < emptyCount; e++) row.push(null);
        } else {
          const color: Color = /[A-Z]/.test(char) ? "w" : "b";
          const type = char.toLowerCase() as PieceType;
          row.push({ color, type });
        }
      }
      newBoard.push(row);
    }

    this._board = newBoard;
    this._turn = turn === "b" ? "b" : "w";

    this._castlingRights = {
      w: { k: false, q: false },
      b: { k: false, q: false },
    };
    if (castling !== "-") {
      if (castling!.includes("K")) this._castlingRights.w.k = true;
      if (castling!.includes("Q")) this._castlingRights.w.q = true;
      if (castling!.includes("k")) this._castlingRights.b.k = true;
      if (castling!.includes("q")) this._castlingRights.b.q = true;
    }

    this._enPassantTarget = ep === "-" ? null : ep!;
    this._halfMoves = half ? parseInt(half, 10) : 0;
    this._fullMoves = full ? parseInt(full, 10) : 1;
    this._history = [];

    return true;
  }

  public fen(): string {
    let fen = "";
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      for (let c = 0; c < 8; c++) {
        const p = this._board[r]![c];
        if (!p) {
          empty++;
        } else {
          if (empty > 0) {
            fen += empty;
            empty = 0;
          }
          fen += p.color === "w" ? p.type.toUpperCase() : p.type;
        }
      }
      if (empty > 0) fen += empty;
      if (r < 7) fen += "/";
    }

    fen += ` ${this._turn}`;

    let castling = "";
    if (this._castlingRights.w.k) castling += "K";
    if (this._castlingRights.w.q) castling += "Q";
    if (this._castlingRights.b.k) castling += "k";
    if (this._castlingRights.b.q) castling += "q";
    fen += ` ${castling || "-"}`;

    fen += ` ${this._enPassantTarget || "-"}`;
    fen += ` ${this._halfMoves} ${this._fullMoves}`;

    return fen;
  }

  // ==== MOVE GENERATION ====
  private rcToSq(r: number, c: number): string {
    return String.fromCharCode(97 + c) + (8 - r);
  }

  private sqToRc(sq: string): { r: number; c: number } {
    const c = sq.charCodeAt(0) - 97;
    const r = 8 - parseInt(sq[1]!, 10);
    return { r, c };
  }

  public moves(options?: { square?: string; verbose?: boolean }): Move[] {
    const color = this._turn;
    const pseudoMoves = this.generatePseudoLegalMoves(color);

    let legal = pseudoMoves.filter((m) => {
      // Apply move
      const state = this.saveState();
      this.makeMoveInternal(m);
      // Is king in check?
      const check = this.isKingInCheck(color);
      // Revert
      this.restoreState(state);
      return !check;
    });

    if (options?.square) {
      legal = legal.filter((m) => m.from === options.square);
    }

    return legal;
  }

  private generatePseudoLegalMoves(color: Color): Move[] {
    const moves: Move[] = [];
    const opp = color === "w" ? "b" : "w";

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this._board[r]![c];
        if (!p || p.color !== color) continue;

        const sq = this.rcToSq(r, c);

        // Pawn
        if (p.type === "p") {
          const step = color === "w" ? -1 : 1;
          const startRank = color === "w" ? 6 : 1;
          const promRank = color === "w" ? 0 : 7;

          // Forward 1
          if (this.isEmpty(r + step, c)) {
            this.addPawnMove(moves, color, sq, r, c, r + step, c, false);
            // Forward 2
            if (r === startRank && this.isEmpty(r + step * 2, c)) {
              moves.push(
                this.createMove(
                  color,
                  "p",
                  sq,
                  this.rcToSq(r + step * 2, c),
                  "b",
                ),
              ); // 'b' flag for Big pawn push
            }
          }

          // Captures
          for (const d of [-1, 1]) {
            if (this.isEnemy(r + step, c + d, opp)) {
              this.addPawnMove(moves, color, sq, r, c, r + step, c + d, true);
            } else if (this._enPassantTarget === this.rcToSq(r + step, c + d)) {
              const m = this.createMove(
                color,
                "p",
                sq,
                this.rcToSq(r + step, c + d),
                "e",
              );
              m.captured = "p";
              moves.push(m);
            }
          }
        }

        // Knight
        if (p.type === "n") {
          for (const [dr, dc] of [
            [-2, -1],
            [-2, 1],
            [-1, -2],
            [-1, 2],
            [1, -2],
            [1, 2],
            [2, -1],
            [2, 1],
          ]) {
            if (this.isEmptyOrEnemy(r + dr, c + dc, opp)) {
              moves.push(
                this.createMove(
                  color,
                  "n",
                  sq,
                  this.rcToSq(r + dr, c + dc),
                  this.isEnemy(r + dr, c + dc, opp) ? "c" : "n",
                ),
              );
            }
          }
        }

        // Sliders (Bishop, Rook, Queen)
        if (p.type === "b" || p.type === "q")
          this.addSlidingMoves(moves, color, p.type, sq, r, c, opp, [
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1],
          ]);
        if (p.type === "r" || p.type === "q")
          this.addSlidingMoves(moves, color, p.type, sq, r, c, opp, [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ]);

        // King
        if (p.type === "k") {
          for (const [dr, dc] of [
            [-1, -1],
            [-1, 0],
            [-1, 1],
            [0, -1],
            [0, 1],
            [1, -1],
            [1, 0],
            [1, 1],
          ]) {
            if (this.isEmptyOrEnemy(r + dr, c + dc, opp)) {
              moves.push(
                this.createMove(
                  color,
                  "k",
                  sq,
                  this.rcToSq(r + dr, c + dc),
                  this.isEnemy(r + dr, c + dc, opp) ? "c" : "n",
                ),
              );
            }
          }

          // Castling
          if (color === "w") {
            if (
              this._castlingRights.w.k &&
              this.isEmpty(7, 5) &&
              this.isEmpty(7, 6)
            ) {
              if (
                !this.isSquareAttacked(7, 4, "b") &&
                !this.isSquareAttacked(7, 5, "b") &&
                !this.isSquareAttacked(7, 6, "b")
              ) {
                moves.push(this.createMove(color, "k", "e1", "g1", "k"));
              }
            }
            if (
              this._castlingRights.w.q &&
              this.isEmpty(7, 3) &&
              this.isEmpty(7, 2) &&
              this.isEmpty(7, 1)
            ) {
              if (
                !this.isSquareAttacked(7, 4, "b") &&
                !this.isSquareAttacked(7, 3, "b") &&
                !this.isSquareAttacked(7, 2, "b")
              ) {
                moves.push(this.createMove(color, "k", "e1", "c1", "q"));
              }
            }
          } else {
            if (
              this._castlingRights.b.k &&
              this.isEmpty(0, 5) &&
              this.isEmpty(0, 6)
            ) {
              if (
                !this.isSquareAttacked(0, 4, "w") &&
                !this.isSquareAttacked(0, 5, "w") &&
                !this.isSquareAttacked(0, 6, "w")
              ) {
                moves.push(this.createMove(color, "k", "e8", "g8", "k"));
              }
            }
            if (
              this._castlingRights.b.q &&
              this.isEmpty(0, 3) &&
              this.isEmpty(0, 2) &&
              this.isEmpty(0, 1)
            ) {
              if (
                !this.isSquareAttacked(0, 4, "w") &&
                !this.isSquareAttacked(0, 3, "w") &&
                !this.isSquareAttacked(0, 2, "w")
              ) {
                moves.push(this.createMove(color, "k", "e8", "c8", "q"));
              }
            }
          }
        }
      }
    }

    return moves;
  }

  private addPawnMove(
    moves: Move[],
    color: Color,
    sq: string,
    r: number,
    c: number,
    nr: number,
    nc: number,
    capture: boolean,
  ) {
    const promRank = color === "w" ? 0 : 7;
    const to = this.rcToSq(nr, nc);
    const flag = capture ? "c" : "n";

    if (nr === promRank) {
      ["q", "r", "b", "n"].forEach((pr) => {
        const m = this.createMove(color, "p", sq, to, capture ? "cp" : "np");
        m.promotion = pr as PieceType;
        moves.push(m);
      });
    } else {
      moves.push(this.createMove(color, "p", sq, to, flag));
    }
  }

  private addSlidingMoves(
    moves: Move[],
    color: Color,
    pt: PieceType,
    sq: string,
    r: number,
    c: number,
    opp: Color,
    dirs: number[][],
  ) {
    for (const [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (this.isEmpty(nr, nc)) {
          moves.push(this.createMove(color, pt, sq, this.rcToSq(nr, nc), "n"));
        } else {
          if (this.isEnemy(nr, nc, opp)) {
            moves.push(
              this.createMove(color, pt, sq, this.rcToSq(nr, nc), "c"),
            );
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  }

  private isEmpty(r: number, c: number) {
    if (r < 0 || r > 7 || c < 0 || c > 7) return false;
    return this._board[r]![c] === null;
  }

  private isEnemy(r: number, c: number, oppColor: Color) {
    if (r < 0 || r > 7 || c < 0 || c > 7) return false;
    const p = this._board[r]![c];
    return p !== null && p.color === oppColor;
  }

  private isEmptyOrEnemy(r: number, c: number, oppColor: Color) {
    return this.isEmpty(r, c) || this.isEnemy(r, c, oppColor);
  }

  private createMove(
    color: Color,
    piece: PieceType,
    from: string,
    to: string,
    flags: string,
  ): Move {
    let captured: PieceType | undefined = undefined;
    if (flags.includes("c") || flags === "e") {
      const { r, c } = this.sqToRc(to);
      const p = this._board[r]![c];
      captured = p ? p.type : flags === "e" ? "p" : undefined;
    }
    const prom = flags.includes("p") ? "q" : "";

    return {
      color,
      piece,
      from,
      to,
      flags,
      captured,
      lan: from + to + prom,
    };
  }

  // ==== ATTACK LOGIC ====
  private isSquareAttacked(
    r: number,
    c: number,
    attackerColor: Color,
  ): boolean {
    // Check pawns
    const pawnDir = attackerColor === "w" ? 1 : -1;
    if (this.isPiece(r + pawnDir, c - 1, attackerColor, "p")) return true;
    if (this.isPiece(r + pawnDir, c + 1, attackerColor, "p")) return true;

    // Check knights
    for (const [dr, dc] of [
      [-2, -1],
      [-2, 1],
      [-1, -2],
      [-1, 2],
      [1, -2],
      [1, 2],
      [2, -1],
      [2, 1],
    ]) {
      if (this.isPiece(r + dr, c + dc, attackerColor, "n")) return true;
    }

    // Check king (for adjacent attacks)
    for (const [dr, dc] of [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ]) {
      if (this.isPiece(r + dr, c + dc, attackerColor, "k")) return true;
    }

    // Check sliding pieces
    const checkLine = (dirs: number[][], types: PieceType[]) => {
      for (const [dr, dc] of dirs) {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const p = this._board[nr]![nc];
          if (p) {
            if (p.color === attackerColor && types.includes(p.type))
              return true;
            break; // Blocked by someone
          }
          nr += dr;
          nc += dc;
        }
      }
      return false;
    };

    if (
      checkLine(
        [
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ],
        ["b", "q"],
      )
    )
      return true;
    if (
      checkLine(
        [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ],
        ["r", "q"],
      )
    )
      return true;

    return false;
  }

  private isPiece(r: number, c: number, color: Color, type: PieceType) {
    if (r < 0 || r > 7 || c < 0 || c > 7) return false;
    const p = this._board[r]![c];
    return p && p.color === color && p.type === type;
  }

  public isKingInCheck(color: Color): boolean {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this._board[r]![c];
        if (p && p.color === color && p.type === "k") {
          return this.isSquareAttacked(r, c, color === "w" ? "b" : "w");
        }
      }
    }
    return false;
  }

  // ==== APPLY & UNDO ====
  public move(
    moveData: string | { from: string; to: string; promotion?: string },
  ): Move | null {
    const legalMoves = this.moves();
    let m = null;

    if (typeof moveData === "string") {
      const matchingMoves = legalMoves.filter(
        (x) => x.lan === moveData || x.lan.startsWith(moveData),
      );
      if (matchingMoves.length > 0) {
        // Default to queen promotion if not specified
        m =
          matchingMoves.find((x) => x.lan === moveData) ||
          matchingMoves.find((x) => x.promotion === "q") ||
          matchingMoves[0];
      }
    } else {
      const lanPrefix = moveData.from + moveData.to;
      m = legalMoves.find(
        (x) =>
          x.lan.startsWith(lanPrefix) &&
          (!moveData.promotion || x.promotion === moveData.promotion),
      );
    }

    if (!m) return null; // Illegal move

    const stateToSave = this.saveState();
    this.makeMoveInternal(m);
    this._history.push(stateToSave);

    return m;
  }

  private makeMoveInternal(m: Move) {
    const { r: r1, c: c1 } = this.sqToRc(m.from);
    const { r: r2, c: c2 } = this.sqToRc(m.to);

    let p = this._board[r1]![c1];

    // Half move reset logic
    if (p?.type === "p" || m.captured) {
      this._halfMoves = 0;
    } else {
      this._halfMoves++;
    }

    // Move piece
    this._board[r1]![c1] = null;

    // Handle promotion
    if (m.promotion) {
      p = { type: m.promotion, color: m.color };
    }

    this._board[r2]![c2] = p;

    // En passant capture
    if (m.flags === "e") {
      const epRow = m.color === "w" ? r2 + 1 : r2 - 1;
      this._board[epRow]![c2] = null;
    }

    // Castling rook move
    if (m.flags === "k") {
      const rkR = r1;
      this._board[rkR]![5] = this._board[rkR]![7];
      this._board[rkR]![7] = null;
    } else if (m.flags === "q") {
      const rkR = r1;
      this._board[rkR]![3] = this._board[rkR]![0];
      this._board[rkR]![0] = null;
    }

    // Update En Passant target
    if (m.flags === "b") {
      // Big pawn push
      this._enPassantTarget = this.rcToSq(
        m.color === "w" ? r2 + 1 : r2 - 1,
        c2,
      );
    } else {
      this._enPassantTarget = null;
    }

    // Update castling rights (if king or rook moves, or rook captured)
    if (p?.type === "k") {
      if (m.color === "w") {
        this._castlingRights.w.k = false;
        this._castlingRights.w.q = false;
      } else {
        this._castlingRights.b.k = false;
        this._castlingRights.b.q = false;
      }
    }
    if (p?.type === "r") {
      if (r1 === 7 && c1 === 7) this._castlingRights.w.k = false;
      if (r1 === 7 && c1 === 0) this._castlingRights.w.q = false;
      if (r1 === 0 && c1 === 7) this._castlingRights.b.k = false;
      if (r1 === 0 && c1 === 0) this._castlingRights.b.q = false;
    }
    // if rook captured
    if (r2 === 7 && c2 === 7) this._castlingRights.w.k = false;
    if (r2 === 7 && c2 === 0) this._castlingRights.w.q = false;
    if (r2 === 0 && c2 === 7) this._castlingRights.b.k = false;
    if (r2 === 0 && c2 === 0) this._castlingRights.b.q = false;

    // Turn & Full move clock
    if (this._turn === "b") this._fullMoves++;
    this._turn = this._turn === "w" ? "b" : "w";
  }

  public undo(): Move | null {
    if (this._history.length === 0) return null;
    const oldState = this._history.pop();
    this.restoreState(oldState!);
    return { lan: "undo" } as any;
  }

  private restoreState(state: GameStateRecord) {
    this._board = state.board;
    this._turn = state.turn;
    this._castlingRights = state.castlingRights;
    this._enPassantTarget = state.enPassantTarget;
    this._halfMoves = state.halfMoves;
    this._fullMoves = state.fullMoves;
  }

  // ==== GAME OVER ====
  public inCheck(): boolean {
    return this.isKingInCheck(this._turn);
  }

  public isCheckmate(): boolean {
    return this.inCheck() && this.moves().length === 0;
  }

  public isStalemate(): boolean {
    return !this.inCheck() && this.moves().length === 0;
  }

  public isDraw(): boolean {
    return this.isStalemate() || this._halfMoves >= 100;
  }

  public isGameOver(): boolean {
    return this.isCheckmate() || this.isDraw();
  }
}
