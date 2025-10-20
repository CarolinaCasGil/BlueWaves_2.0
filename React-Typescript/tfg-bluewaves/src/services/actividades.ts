import { list, getById } from '../lib/db'

export type Actividad = {
	id: number
	nombre: string
	descripcion?: string
	capacidad?: number
	costo?: number
	foto?: string
}

export const ActividadesService = {
	all: () => list<Actividad>('actividades', 'id,nombre,descripcion,capacidad, costo, foto', { order: { col: 'nombre' } }),
	byId: (id: number) => getById<Actividad>('actividades', id)
}
