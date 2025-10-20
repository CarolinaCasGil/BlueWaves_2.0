// src/services/resenas.ts
import { list, getById } from '../lib/db'

export type Resena = {
	id: number
	alojamiento_id: number
	usuario: string
	rating: number | null
	comentario: string
	created_at?: string | null
}

const SELECT =
	'id,alojamiento_id,usuario,rating,comentario,created_at'

export const ResenaService = {
	all: () => list<Resena>('resenas', SELECT, { order: { col: 'created_at', asc: false } }),

	byId: (id: number) => getById<Resena>('resenas', id, SELECT),

	byAlojamiento: (alojamientoId: number, limit?: number) =>
		list<Resena>(
			'resenas',
			SELECT,
			{
				eq: { alojamiento_id: alojamientoId },
				order: { col: 'created_at', asc: false },
				...(limit ? { limit } : {})
			}
		),
}
