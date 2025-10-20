import { list, getById } from '../lib/db'

export type Carrito = {
	id: number
	user_id: string
	producto_id: number
	cantidad: number
}

const SELECT = 'id,user_id,producto_id,cantidad'

export const CarritoService = {
	all: () => list<Carrito>('carritos', SELECT, { order: { col: 'id' } }),
	byId: (id: number) => getById<Carrito>('carritos', id, SELECT),
}
