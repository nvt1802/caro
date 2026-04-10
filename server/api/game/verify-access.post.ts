import { serverSupabaseClient } from "#supabase/server";
import { type RoomRow } from "../../utils/caro";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { code: rawCode, password, userName } = body;
  const code = (rawCode || "").trim().toUpperCase();

  if (!code) {
    throw createError({ statusCode: 400, message: "Thiếu mã phòng." });
  }

  const client = await serverSupabaseClient(event);
  
  const { data: room, error } = await (client.from("caro_rooms") as any)
    .select("*")
    .eq("code", code)
    .single();

  if (error || !room) {
    if (error) console.error("Verify Access DB Error:", error);
    throw createError({ statusCode: 404, message: "Không tìm thấy phòng hoặc lỗi hệ thống." });
  }

  const roomData = room as RoomRow;

  // 1. Nếu phòng không có mật khẩu -> OK
  if (!roomData.password) {
    return { success: true, isPrivate: false };
  }

  // 2. Nếu người dùng hiện tại là Host hoặc Guest đã được ghi nhận -> OK
  if (userName === roomData.host_name || userName === roomData.guest_name) {
    return { success: true, isPrivate: true, roleInRoom: userName === roomData.host_name ? 'host' : 'guest' };
  }

  // 3. Kiểm tra mật khẩu (đối với người mới vào xem hoặc chưa join)
  if (roomData.password === password) {
    return { success: true, isPrivate: true };
  }

  return { success: false, isPrivate: true, message: "Mật khẩu không chính xác." };
});
