import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { normalizePlayerName } from "~~/shared/game";
import { type RoomRow } from "../../utils/game";

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
  let user = null;
  try {
    user = await serverSupabaseUser(event);
  } catch (e) {
    // Auth session missing is expected for guests
  }

  // Fetch room first
  const { data: room, error: fetchError } = await client
    .from("rooms")
    .select("*")
    .eq("code", code)
    .single();

  if (fetchError || !room) {
    throw createError({ statusCode: 404, message: "Không tìm thấy phòng." });
  }

  const roomRow = room as RoomRow;

  // Check password if set
  if (roomRow.password && roomRow.password !== password) {
    throw createError({
      statusCode: 403,
      message: "Mật khẩu không đúng.",
    });
  }

  const connectedCount =
    (roomRow.host_connected ? 1 : 0) + (roomRow.guest_connected ? 1 : 0);
  if (connectedCount >= 2) {
    throw createError({
      statusCode: 400,
      message: "Phòng đã đầy.",
    });
  }

  const updates: Partial<RoomRow> = {
    guest_name: normalizePlayerName(name),
    guest_connected: true,
    updated_at: new Date().toISOString(),
  };

  if (user) {
    updates.guest_id = user.id;
  }

  // Update guest info
  const { error: updateError } = await (client.from("rooms") as any)
    .update(updates)
    .eq("code", code);

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message });
  }

  return { success: true };
});
