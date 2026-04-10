import { serverSupabaseClient } from '#supabase/server'
import { createNewRoomRow } from '../../utils/caro'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { code, name } = body

  if (!code || !name) {
    throw createError({ statusCode: 400, message: 'Thiếu mã phòng hoặc tên người chơi.' })
  }

  const client = await serverSupabaseClient(event)
  const newRoom = createNewRoomRow(code, name)

  const { data, error } = await client
    .from('caro_rooms')
    .insert([newRoom])
    .select()
    .single()

  if (error) {
    if (error.code === '23505') { // Unique violation
        throw createError({ statusCode: 400, message: 'Mã phòng này đã tồn tại.' })
    }
    throw createError({ statusCode: 500, message: error.message })
  }

  return { success: true, room: data }
})
