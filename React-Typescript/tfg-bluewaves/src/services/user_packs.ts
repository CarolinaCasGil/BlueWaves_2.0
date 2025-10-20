import { list, getById } from '../lib/db'

export type User_Pack = {
	id: number
	user_id: string
	pack_id: number
	fecha: string
}

const SELECT = 'id,user_id,pack_id,fecha_inicio'

export const User_PackService = {
	all: () => list<User_Pack>('user_packs', SELECT, { order: { col: 'fecha_inicio' } }),
	byId: (id: number) => getById<User_Pack>('user_packs', id, SELECT),
}
