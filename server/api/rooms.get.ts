import { listRoomItems } from '../utils/caro'

export default defineEventHandler(() => {
  return {
    rooms: listRoomItems()
  }
})
