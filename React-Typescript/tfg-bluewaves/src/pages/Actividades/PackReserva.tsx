// src/pages/Actividades/PackReserva.tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

/** ===== Tipos auxiliares ===== */
type HoraRow = { id: number; actividad_id: number; hora_inicio: string; hora_fin: string }
type ActividadRow = { id: number; nombre?: string | null; cantidad?: number | null } // cantidad = capacidad por clase
type PackRow = { id: number; titulo?: string | null; actividad_id: number; cant_act?: number | null; precio?: number | null }

type UserPackRow = { fecha: string | null; cant_pers: number | null }
type CountByDate = Record<string, number>

type ClaseElegida = {
	fecha: string | null
	hora_id: number | null
	cant_pers: number
}

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Cuenta cuántas plazas hay ocupadas por día para una hora concreta en un rango */
async function getCountByDateForHour(
	horaId: number,
	fromISO: string,
	toISO: string
): Promise<CountByDate> {
	const { data: upRows, error: upErr } = await supabase
		.from('user_packs')
		.select('fecha, cant_pers')
		.eq('hora_id', horaId)
		.gte('fecha', fromISO)
		.lte('fecha', toISO)

	if (upErr) throw upErr

	const map: CountByDate = {}
	for (const r of (upRows ?? []) as UserPackRow[]) {
		if (!r.fecha) continue
		const key = r.fecha.slice(0, 10) // YYYY-MM-DD
		map[key] = (map[key] ?? 0) + Number(r.cant_pers ?? 0)
	}
	return map
}

/** Devuelve lista de días con hueco para esa hora teniendo en cuenta la capacidad */
async function buildEligibleDatesForHour(
	horaId: number,
	capacidadActividad: number,
	fromISO: string,
	toISO: string
): Promise<string[]> {
	const countsByDate = await getCountByDateForHour(horaId, fromISO, toISO)

	const out: string[] = []
	const start = new Date(fromISO)
	const end = new Date(toISO)
	start.setHours(0, 0, 0, 0)
	end.setHours(0, 0, 0, 0)

	for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
		const key = toKey(d)
		const usados = countsByDate[key] ?? 0
		if (usados < capacidadActividad) out.push(key)
	}
	return out
}

/** ===== Componente ===== */
export default function PackReserva() {
	const { id } = useParams<{ id: string }>()
	const packId = Number(id)
	const nav = useNavigate()

	const [loading, setLoading] = useState(true)
	const [err, setErr] = useState<string | null>(null)

	const [pack, setPack] = useState<PackRow | null>(null)
	const [actividad, setActividad] = useState<ActividadRow | null>(null)
	const [horas, setHoras] = useState<HoraRow[]>([])

	// Selección paso a paso (una clase cada vez → “Siguiente”)
	const [step, setStep] = useState(0)
	const [clases, setClases] = useState<ClaseElegida[]>([])
	const [selectedHora, setSelectedHora] = useState<number | ''>('')
	const [eligibleDates, setEligibleDates] = useState<string[]>([])
	const [selectedDate, setSelectedDate] = useState<string>('')
	const [personas, setPersonas] = useState<number>(1)

	// Rango de búsqueda por defecto (hoy → hoy + 6 meses)
	const today = useMemo(() => {
		const d = new Date()
		d.setHours(0, 0, 0, 0)
		return toKey(d)
	}, [])
	const sixMonthsOut = useMemo(() => {
		const d = new Date()
		d.setMonth(d.getMonth() + 6, 1)
		d.setHours(0, 0, 0, 0)
		return toKey(d)
	}, [])

	// Carga pack + actividad + horas
	useEffect(() => {
		let mounted = true
			; (async () => {
				try {
					setLoading(true); setErr(null)

					const { data: p, error: e1 } = await supabase
						.from('packs')
						.select('id, titulo, actividad_id, cant_act, precio')
						.eq('id', packId)
						.maybeSingle()
					if (e1) throw e1
					if (!p) throw new Error('Pack no encontrado')
					const packRow = p as PackRow

					const { data: act, error: e2 } = await supabase
						.from('actividades')
						.select('id, nombre, cantidad')
						.eq('id', packRow.actividad_id)
						.maybeSingle()
					if (e2) throw e2
					const actRow = act as ActividadRow | null

					const { data: horasRows, error: e3 } = await supabase
						.from('actividad_horas')
						.select('id, actividad_id, hora_inicio, hora_fin')
						.eq('actividad_id', packRow.actividad_id)
						.order('hora_inicio', { ascending: true })
					if (e3) throw e3

					if (!mounted) return
					setPack(packRow)
					setActividad(actRow)
					setHoras((horasRows ?? []) as HoraRow[])

					const cantAct = Math.max(1, Number(packRow.cant_act ?? 1))
					setClases(Array.from({ length: cantAct }, () => ({ fecha: null, hora_id: null, cant_pers: 1 })))
				} catch (e: any) {
					if (mounted) setErr(e?.message ?? 'No se pudo cargar el pack')
				} finally {
					if (mounted) setLoading(false)
				}
			})()
		return () => { mounted = false }
	}, [packId])

	const capacidad = Number(actividad?.cantidad ?? 0)

	// Cuando elige hora, calculamos días elegibles
	const computeEligibleDates = useCallback(async (horaId: number) => {
		try {
			setErr(null)
			const dates = await buildEligibleDatesForHour(horaId, capacidad || 0, today, sixMonthsOut)
			setEligibleDates(dates)
		} catch (e: any) {
			setEligibleDates([])
			setErr(e?.message ?? 'No se pudo calcular disponibilidad')
		}
	}, [capacidad, sixMonthsOut, today])

	const nextClase = () => {
		if (!selectedHora || !selectedDate) {
			setErr('Selecciona hora y día para continuar')
			return
		}
		const next = [...clases]
		next[step] = {
			fecha: selectedDate,
			hora_id: Number(selectedHora),
			cant_pers: personas,
		}
		setClases(next)

		// Reset selección para la siguiente clase si existe
		setSelectedHora('')
		setSelectedDate('')
		setPersonas(1)

		if (step + 1 < next.length) {
			setStep(step + 1)
		}
	}

	const editarClase = (idx: number) => {
		// Llevar al usuario a editar la clase idx
		setStep(idx)
		const c = clases[idx]
		setSelectedHora(c.hora_id ?? '')
		setSelectedDate(c.fecha ?? '')
		setPersonas(c.cant_pers || 1)
		if (c.hora_id) computeEligibleDates(c.hora_id)
	}

	const confirmarReserva = async () => {
		try {
			setErr(null)
			// Comprobación final de capacidad por cada clase (fecha y hora)
			for (const c of clases) {
				if (!c.fecha || !c.hora_id) throw new Error('Faltan clases por completar')
				// Recuento del día
				const counts = await getCountByDateForHour(c.hora_id, c.fecha, c.fecha)
				const ocupadas = counts[c.fecha] ?? 0
				if (capacidad && ocupadas + (c.cant_pers || 1) > capacidad) {
					throw new Error(`La clase del ${c.fecha} supera la capacidad (${capacidad}). Ajusta personas u hora.`)
				}
			}

			// Insert simbólico: normalmente aquí harías el pago y luego inserts
			const { data: sessionRes } = await supabase.auth.getSession()
			const userId = sessionRes?.session?.user?.id
			if (!userId) throw new Error('No hay sesión activa')

			const rows = clases.map(c => ({
				user_id: userId,
				pack_id: packId,
				hora_id: c.hora_id!,
				fecha: c.fecha!,
				cant_pers: c.cant_pers || 1,
			}))

			const { error } = await supabase.from('user_packs').insert(rows)
			if (error) throw error

			alert('¡Reserva de pack creada!')
			nav('/login')
		} catch (e: any) {
			setErr(e?.message ?? 'No se pudo crear la reserva')
		}
	}

	const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '—')
	const horaActual = useMemo(() => horas.find(h => h.id === Number(selectedHora)) ?? null, [horas, selectedHora])

	return (
		<main className="container" style={{ padding: '20px 0' }}>
			{loading && <div className="state">Cargando…</div>}
			{err && <div className="state state--error">Error: {err}</div>}
			{!loading && !err && pack && actividad && (
				<section>
					<header style={{ marginBottom: 12 }}>
						<h1>Reservar pack: {pack.titulo ?? `#${pack.id}`}</h1>
						<p>Actividad: {actividad.nombre ?? `#${actividad.id}`} · Capacidad por clase: <strong>{capacidad || '—'}</strong></p>
					</header>

					{/* Paso actual */}
					<div className="card" style={{ padding: 16, marginBottom: 16 }}>
						<h2>Clase {step + 1} de {clases.length}</h2>

						<div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(220px, 360px) 1fr' }}>
							<label className="auth__label">
								Hora
								<select
									value={selectedHora}
									onChange={async (e) => {
										const v = e.target.value ? Number(e.target.value) : ''
										setSelectedHora(v as any)
										setSelectedDate('')
										if (typeof v === 'number') await computeEligibleDates(v)
									}}
								>
									<option value="">Elige una hora</option>
									{horas.map(h => (
										<option key={h.id} value={h.id}>
											{hhmm(h.hora_inicio)}–{hhmm(h.hora_fin)}
										</option>
									))}
								</select>
							</label>

							<div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
								<label className="auth__label">
									Día disponible
									<select
										value={selectedDate}
										onChange={(e) => setSelectedDate(e.target.value)}
										disabled={!selectedHora}
									>
										<option value="">Elige un día</option>
										{eligibleDates.map(d => (
											<option key={d} value={d}>{d.split('-').reverse().join('-')}</option>
										))}
									</select>
								</label>

								<label className="auth__label">
									Personas
									<input
										type="number"
										min={1}
										value={personas}
										onChange={(e) => setPersonas(Math.max(1, Number(e.target.value || 1)))}
										inputMode="numeric"
									/>
								</label>

								<button className="btn btn--primary" type="button" onClick={nextClase}>
									{step + 1 < clases.length ? 'Siguiente clase' : 'Añadir y revisar'}
								</button>
							</div>
						</div>
					</div>

					{/* Resumen */}
					<div className="card" style={{ padding: 16 }}>
						<h3>Resumen</h3>
						{clases.map((c, i) => {
							const h = c.hora_id ? horas.find(x => x.id === c.hora_id) : null
							return (
								<div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: '8px 0', borderTop: '1px solid #eee' }}>
									<div>
										<strong>Clase {i + 1}:</strong>{' '}
										{c.fecha ? c.fecha.split('-').reverse().join('-') : '—'}{' '}
										{h ? `· ${hhmm(h.hora_inicio)}–${hhmm(h.hora_fin)}` : ''}{' '}
										{c.cant_pers ? `· ${c.cant_pers}x👤` : ''}
									</div>
									<button className="btn btn--ghost btn--sm" onClick={() => editarClase(i)}>Editar</button>
								</div>
							)
						})}

						<div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
							<button className="btn btn--primary" onClick={confirmarReserva}>Confirmar pack</button>
						</div>
					</div>
				</section>
			)}
		</main>
	)
}
