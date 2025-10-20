import { list, getById } from '../lib/db'

export type Pedido = {
	id: number
	user_id: string
	producto_id: number
	cantidad: number
	fecha_pedido: string
}

const SELECT = 'id,user_id,producto_id,cantidad,fecha_pedido'

export const PedidoService = {
	all: () => list<Pedido>('pedidos', SELECT, { order: { col: 'fecha_pedido' } }),
	byId: (id: number) => getById<Pedido>('pedidos', id, SELECT),
}
