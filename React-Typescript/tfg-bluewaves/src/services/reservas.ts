import { list, getById } from '../lib/db'

export type Reserva = {
	id: number
	user_id: string
	alojamiento_id: number
	fecha_entrada: string
	fecha_salida: string
}

const SELECT = 'id,user_id,alojamiento_id,fecha_entrada,fecha_salida'

export const ReservasService = {
	all: () => list<Reserva>('reservas', SELECT, { order: { col: 'fecha_entrada' } }),
	byId: (id: number) => getById<Reserva>('reservas', id, SELECT),
}
