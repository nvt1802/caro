import { serverSupabaseClient } from "#supabase/server";
import { normalizePlayerName } from "#shared/caro";
import { type RoomRow } from "../../utils/caro";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { code, name, password } = body;

  if (!code || !name) {
    throw createError({
      statusCode: 400,
      message: "Thiếu mã phòng hoặc tên người chơi.",
    });
  }

  const client = await serverSupabaseClient(event);

  // Fetch room first
  const { data: room, error: fetchError } = await client
    .from("caro_rooms")
    .select("*")
    .eq("code", code)
    .single();

  if (fetchError || !room) {
    throw createError({ statusCode: 404, message: "Không tìm thấy phòng." });
  }

  const roomData = room as RoomRow;

  // Check password if set
  if (roomData.password && roomData.password !== password) {
    throw createError({
      statusCode: 401,
      message: "Mật khẩu phòng không chính xác.",
    });
  }

  if (roomData.guest_name !== "Guest" && roomData.guest_name !== name) {
    throw createError({
      statusCode: 400,
      message: "Phòng đã đủ 2 người chơi.",
    });
  }

  // Update guest info
  const { error: updateError } = await (client.from("caro_rooms") as any)
    .update({
      guest_name: normalizePlayerName(name),
      updated_at: new Date().toISOString(),
    })
    .eq("code", code);

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message });
  }

  return { success: true };
});
