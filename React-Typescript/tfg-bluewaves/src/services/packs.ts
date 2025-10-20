import { list, getById } from '../lib/db'

export type Pack = {
	id: number
	cant_actv: number
	costo: number
	titulo: string
	descripcion?: string | null
	foto?: string | null
	cant_comprada: number
	actividad_id?: number | null
}

const SELECT = 'id,cant_actv,costo,titulo,descripcion,foto,cant_comprada,actividad_id'

export const PackService = {
	all: () => list<Pack>('packs', SELECT, { order: { col: 'titulo' } }),
	byId: (id: number) => getById<Pack>('packs', id, SELECT),
}
