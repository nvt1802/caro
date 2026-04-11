import { serverSupabaseClient } from '#supabase/server'
import { rowToListItem, type RoomRow } from '../utils/game'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  
  const { data: rooms, error } = await client
    .from('rooms')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  const items = (rooms as RoomRow[]).map(rowToListItem)

  return { rooms: items }
})
