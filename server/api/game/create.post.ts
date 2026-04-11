import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { createNewRoomRow } from "../../utils/game";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { code, name, roomName, password, isAi } = body;

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

  const newRoom = createNewRoomRow(code, name, roomName, password, isAi, body.gameType || 'caro');
  if (user) {
    newRoom.host_id = user.id;
  }

  const { data, error } = await (client.from("rooms") as any)
    .insert([newRoom])
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      // Unique violation
      throw createError({
        statusCode: 400,
        message: "Mã phòng này đã tồn tại.",
      });
    }
    throw createError({ statusCode: 500, message: error.message });
  }

  return { success: true, room: data };
});
