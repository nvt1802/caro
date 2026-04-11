import { serverSupabaseClient } from "#supabase/server";
import {
  processMove,
  processChessMove,
  processXiangqiMove,
  processChat,
  type RoomRow,
  calculateAIMove,
  createInitialChessBoard,
} from "../../utils/game";
import { calculateChessAIMove } from "../../utils/chess-ai";
import { calculateXiangqiAIMove } from "../../utils/xiangqi-ai";
import { createEmptyBoard, type Mark } from "~~/shared/game";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { code, role, type, row, col, text, move: chessMove } = body;

  if (!code || !role) {
    throw createError({
      statusCode: 400,
      message: "Thiếu thông tin phòng hoặc vai trò.",
    });
  }

  const client = await serverSupabaseClient(event);

  // Fetch current state
  const { data: room, error: fetchError } = await client
    .from("rooms")
    .select("*")
    .eq("code", code)
    .single();

  if (fetchError || !room) {
    throw createError({ statusCode: 404, message: "Không tìm thấy phòng." });
  }

  const roomRow = room as RoomRow;
  let updates: Partial<RoomRow> = {};

  if (type === "move") {
    if (roomRow.game_type === "chess") {
      const result = processChessMove(roomRow, role, chessMove);
      if (typeof result === "string") {
        throw createError({ statusCode: 400, message: result });
      }
      updates = result;
    } else if (roomRow.game_type === "xiangqi") {
      const result = processXiangqiMove(roomRow, role, chessMove);
      if (typeof result === "string") {
        throw createError({ statusCode: 400, message: result });
      }
      updates = result;
    } else {
      const result = processMove(roomRow, role, row, col);
      if (typeof result === "string") {
        throw createError({ statusCode: 400, message: result });
      }
      updates = result;
    }
  } else if (type === "chat") {
    updates = processChat(roomRow, role, text);
  } else if (type === "ready") {
    if (role === "host") updates.host_ready = !roomRow.host_ready;
    else updates.guest_ready = !roomRow.guest_ready;
    updates.updated_at = new Date().toISOString();
  } else if (type === "start") {
    if (role !== "host")
      throw createError({
        statusCode: 403,
        message: "Chỉ chủ phòng mới có thể bắt đầu.",
      });
    if (!roomRow.guest_ready)
      throw createError({
        statusCode: 400,
        message: "Đợi người chơi kia sẵn sàng.",
      });

    updates = {
      status: "playing",
      board: roomRow.game_type === "chess" ? createInitialChessBoard() as any : createEmptyBoard(),
      winner: null,
      winning_line: [],
      turn: roomRow.game_type === "chess" ? "X" : (Math.random() < 0.5 ? "X" : "O"), // X = White always starts in Chess
      time_left: 180,
      updated_at: new Date().toISOString(),
    };
  } else if (type === "restart") {
    if (role !== "host")
      throw createError({
        statusCode: 403,
        message: "Chỉ chủ phòng mới có thể bắt đầu lại.",
      });

    const isAi = roomRow.is_ai;
    updates = {
      status: isAi ? "playing" : "waiting",
      board: roomRow.game_type === "chess" ? createInitialChessBoard() as any : createEmptyBoard(),
      winner: null,
      winning_line: [],
      turn: roomRow.game_type === "chess" ? "X" : (Math.random() < 0.5 ? "X" : "O"),
      host_ready: isAi,
      guest_ready: isAi,
      time_left: 180,
      updated_at: new Date().toISOString(),
    };
  } else if (type === "leave") {
    if (role === "host") {
      const { error: deleteError } = await client
        .from("rooms")
        .delete()
        .eq("code", code);

      if (deleteError)
        throw createError({ statusCode: 500, message: deleteError.message });
      return { success: true, deleted: true };
    } else {
      updates = {
        guest_name: "Guest",
        guest_connected: false,
        guest_ready: false,
        status: "waiting",
        board: roomRow.game_type === "chess" ? createInitialChessBoard() as any : createEmptyBoard(),
        winning_line: [],
        updated_at: new Date().toISOString(),
      };
    }
  } else if (type === "sync") {
    if (roomRow.status === "playing") {
      const now = new Date();
      const lastUpdate = new Date(roomRow.updated_at);
      const elapsedSeconds = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
      const currentRealTimeLeft = Math.max(0, roomRow.time_left - elapsedSeconds);

      if (currentRealTimeLeft <= 0) {
        const opponentMark: Mark = roomRow.turn === "X" ? "O" : "X";
        const scores = { ...roomRow.scores };
        scores[opponentMark] += 1;

        updates = {
          status: "finished",
          winner: opponentMark,
          time_left: 0,
          updated_at: now.toISOString(),
          scores
        };
      }
    }
  }

  // --- AI Turn Logic ---
  const nextStatus = updates.status || roomRow.status;
  const nextTurn = updates.turn || roomRow.turn;
  const isAiRoom = roomRow.is_ai;

  if (isAiRoom && nextStatus === "playing" && nextTurn === "O") {
    const interimRow: RoomRow = { ...roomRow, ...updates };
    
    if (roomRow.game_type === "chess") {
      const fen = typeof interimRow.board === "string" ? interimRow.board : (createInitialChessBoard() as string);
      const aiMove = calculateChessAIMove(fen);
      if (aiMove) {
        const aiResult = processChessMove(interimRow, "guest", aiMove);
        if (typeof aiResult !== "string") {
          updates = { ...updates, ...aiResult };
        }
      }
    } else if (roomRow.game_type === "xiangqi") {
      // Create initial xiangqi fen if empty
      // By default it is already populated via empty string check inside engine, or we could pass undefined
      const fen = typeof interimRow.board === "string" && interimRow.board.length > 5 ? interimRow.board : undefined;
      const aiMove = calculateXiangqiAIMove(fen, 3, "b"); // Guest is 'b' (Black) in Xiangqi
      if (aiMove) {
        // AI returns { from: 'r,c', to: 'r,c' }, so we construct moveStr
        const moveStr = `${aiMove.from}-${aiMove.to}`;
        const aiResult = processXiangqiMove(interimRow, "guest", moveStr);
        if (typeof aiResult !== "string") {
          updates = { ...updates, ...aiResult };
        }
      }
    } else {
      const boardBeforeAi = updates.board || roomRow.board;
      const aiMove = calculateAIMove(boardBeforeAi as any, "O");
      if (aiMove) {
        const aiResult = processMove(interimRow, "guest", aiMove.r, aiMove.c);
        if (typeof aiResult !== "string") {
          updates = { ...updates, ...aiResult };
        }
      }
    }
  }

  // --- Statistics Update Logic ---
  const finalStatus = updates.status || roomRow.status;
  const winner = updates.winner || roomRow.winner;
  
  if (roomRow.status === "playing" && finalStatus === "finished" && !roomRow.is_ai) {
    const gameType = roomRow.game_type;
    const hostId = roomRow.host_id;
    const guestId = roomRow.guest_id;

    if (winner === "draw") {
      if (hostId) await client.rpc("increment_user_stat", { p_user_id: hostId, p_game_type: gameType, p_result: "draw" });
      if (guestId) await client.rpc("increment_user_stat", { p_user_id: guestId, p_game_type: gameType, p_result: "draw" });
    } else if (winner === "X") {
      // Host ('X') wins
      if (hostId) await client.rpc("increment_user_stat", { p_user_id: hostId, p_game_type: gameType, p_result: "win" });
      if (guestId) await client.rpc("increment_user_stat", { p_user_id: guestId, p_game_type: gameType, p_result: "loss" });
    } else if (winner === "O") {
      // Guest ('O') wins
      if (hostId) await client.rpc("increment_user_stat", { p_user_id: hostId, p_game_type: gameType, p_result: "loss" });
      if (guestId) await client.rpc("increment_user_stat", { p_user_id: guestId, p_game_type: gameType, p_result: "win" });
    }
  }

  // Save updates
  const { error: updateError } = await (client.from("rooms") as any)
    .update(updates)
    .eq("code", code);

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message });
  }

  return { success: true };
});
