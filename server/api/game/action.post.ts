import { serverSupabaseClient } from '#supabase/server'
import { processMove, processChat, type RoomRow } from '../../utils/caro'
import { createEmptyBoard, TURN_TIME_LIMIT } from '#shared/caro'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { code, role, type, row, col, text } = body

  if (!code || !role) {
    throw createError({ statusCode: 400, message: 'Thiếu thông tin phòng hoặc vai trò.' })
  }

  const client = await serverSupabaseClient(event)
  
  // Fetch current state
  const { data: room, error: fetchError } = await client
    .from('caro_rooms')
    .select('*')
    .eq('code', code)
    .single()

  if (fetchError || !room) {
    throw createError({ statusCode: 404, message: 'Không tìm thấy phòng.' })
  }

  const roomRow = room as RoomRow
  let updates: Partial<RoomRow> = {}

  if (type === 'move') {
    const result = processMove(roomRow, role, row, col)
    if (typeof result === 'string') {
      throw createError({ statusCode: 400, message: result })
    }
    updates = result
  } else if (type === 'chat') {
    updates = processChat(roomRow, role, text)
  } else if (type === 'ready') {
    if (role === 'host') updates.host_ready = !roomRow.host_ready
    else updates.guest_ready = !roomRow.guest_ready
    updates.updated_at = new Date().toISOString()
  } else if (type === 'start') {
    if (role !== 'host') throw createError({ statusCode: 403, message: 'Chỉ chủ phòng mới có thể bắt đầu.' })
    if (!roomRow.guest_ready) throw createError({ statusCode: 400, message: 'Đợi người chơi kia sẵn sàng.' })
    
    updates = {
      status: 'playing',
      board: createEmptyBoard(),
      winner: null,
      winning_line: [],
      turn: Math.random() < 0.5 ? 'X' : 'O',
      time_left: TURN_TIME_LIMIT,
      updated_at: new Date().toISOString()
    }
  } else if (type === 'restart') {
    if (role !== 'host') throw createError({ statusCode: 403, message: 'Chỉ chủ phòng mới có thể bắt đầu lại.' })
    updates = {
      status: 'waiting',
      board: createEmptyBoard(),
      winner: null,
      winning_line: [],
      turn: 'X',
      host_ready: false,
      guest_ready: false,
      time_left: TURN_TIME_LIMIT,
      updated_at: new Date().toISOString()
    }
  } else if (type === 'leave') {
    if (role === 'host') {
      const { error: deleteError } = await client
        .from('caro_rooms')
        .delete()
        .eq('code', code)
      
      if (deleteError) throw createError({ statusCode: 500, message: deleteError.message })
      return { success: true, deleted: true }
    } else {
      // Guest leaves: reset guest info AND reset game to waiting
      updates = {
        guest_name: 'Guest',
        guest_ready: false,
        status: 'waiting',
        board: createEmptyBoard(),
        winning_line: [],
        updated_at: new Date().toISOString()
      }
    }
  }

  // Save updates
  const { error: updateError } = await client
    .from('caro_rooms')
    .update(updates)
    .eq('code', code)

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message })
  }

  return { success: true }
})
