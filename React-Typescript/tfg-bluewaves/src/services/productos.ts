import { list, getById } from '../lib/db'

export type Producto = {
	id: number
	nombre: string
	cantidad: number
	costo: number
	cant_comprada: number
	foto?: string | null
}

const SELECT = 'id,nombre,cantidad,costo,cant_comprada,foto'

export const ProductosService = {
	all: () => list<Producto>('productos', SELECT, { order: { col: 'nombre' } }),
	byId: (id: number) => getById<Producto>('productos', id, SELECT),
}
