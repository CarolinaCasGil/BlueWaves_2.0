import { supabase } from './supabase'

export async function list<T>(table: string, select = '*', opts?: { eq?: Record<string, any>; limit?: number; order?: { col: string; asc?: boolean } }) {
	let q = supabase.from(table).select(select)
	if (opts?.eq) for (const [k, v] of Object.entries(opts.eq)) q = q.eq(k, v)
	if (opts?.order) q = q.order(opts.order.col, { ascending: opts.order.asc ?? true })
	if (opts?.limit) q = q.limit(opts.limit)
	const { data, error } = await q
	if (error) throw error
	return data as T[]
}

export async function getById<T>(table: string, id: number | string, select = '*', idCol = 'id') {
	const { data, error } = await supabase.from(table).select(select).eq(idCol, id).single()
	if (error) throw error
	return data as T
}
