// src/services/alojamientos.ts
import { supabase } from '../lib/supabase'

export type Alojamiento = {
	id: number
	nombre: string
	descripcion?: string | null
	costo?: number | null
	foto1?: string | null
	foto2?: string | null
	foto3?: string | null
	foto4?: string | null
	lugar?: string | null
	direccion?: string | null
	maps?: string | null
	capacidad?: number | null
	pack_id?: number | null
}

export const AlojamientoService = {
	async all(): Promise<Alojamiento[]> {
		const { data, error } = await supabase
			.from('alojamientos')
			.select('id,nombre,descripcion,costo,foto1,foto2,foto3,foto4,lugar,direccion,maps,capacidad,pack_id')
			.order('id', { ascending: true })

		if (error) throw error
		return (data ?? []) as Alojamiento[]
	},

	async byId(id: number): Promise<Alojamiento> {
		const { data, error } = await supabase
			.from('alojamientos')
			.select('id,nombre,descripcion,costo,foto1,foto2,foto3,foto4,lugar,direccion,maps, capacidad,pack_id')
			.eq('id', id)
			.maybeSingle()

		if (error) throw error
		if (!data) throw new Error('Alojamiento no encontrado')
		return data as Alojamiento
	},
}
