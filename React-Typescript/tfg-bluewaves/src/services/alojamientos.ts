// src/services/alojamientos.ts
import { list, getById } from '../lib/db'

export type Alojamiento = {
	id: number
	nombre: string
	descripcion?: string | null
	direccion?: string | null
	lugar?: string | null
	costo?: number | null
	maps?: string | null
	foto1?: string | null
	foto2?: string | null
	foto3?: string | null
	foto4?: string | null
	capacidad?: number | null
}

const SELECT = `
  id,
  nombre,
  descripcion,
  direccion,
  lugar,
  costo,
  maps,
  foto1,
  foto2,
  foto3,
  foto4,
  capacidad
`

export const AlojamientoService = {
	all: () =>
		list<Alojamiento>('alojamientos', SELECT, {
			order: { col: 'id', asc: true },
		}),

	byId: (id: number) =>
		getById<Alojamiento>('alojamientos', id, SELECT),
}
