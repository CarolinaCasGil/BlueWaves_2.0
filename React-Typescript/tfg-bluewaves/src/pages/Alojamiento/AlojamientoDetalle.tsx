import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { AlojamientoService, type Alojamiento } from '../../services/alojamientos'
import { ResenaService, type Resena } from '../../services/resenas'
import DateRangePicker, { type DateRange } from '../../components/DateRangePicker/DateRangePicker'
import ResenaCard from '../../components/cards/ResenaCard'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { supabase } from '../../lib/supabase'
import PayReservationModal from './components/PayReservationModal'
import './AlojamientoDetalle.css'

function money(v?: number | null) {
	if (v == null) return '—'
	return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
}
function toEmbedSrc(rawUrl: string | undefined, fallbackQuery: string): string {
	if (!rawUrl || !rawUrl.trim()) return `https://www.google.com/maps?q=${encodeURIComponent(fallbackQuery)}&output=embed`
	const url = rawUrl.trim()
	if (url.includes('/embed')) return url
	return `https://www.google.com/maps?q=${encodeURIComponent(url)}&output=embed`
}
function parseISOstr(s?: string | null): Date | null {
	if (!s) return null
	const [y, m, d] = s.split('-').map(Number)
	if (!y || !m || !d) return null
	return new Date(y, m - 1, d)
}
function nightsBetween(from?: string | null, to?: string | null): number {
	const a = parseISOstr(from)
	const b = parseISOstr(to)
	if (!a || !b) return 0
	const MS = 24 * 60 * 60 * 1000
	return Math.max(0, Math.round((b.getTime() - a.getTime()) / MS))
}

/* ===== Helpers de fechas y ocupación ===== */
const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const addDays = (d: Date, delta: number) => { const nd = new Date(d); nd.setDate(d.getDate() + delta); return nd }
const rangeDatesKeys = (from: Date, nights: number) => {
	const keys: string[] = []
	for (let i = 0; i < nights; i++) keys.push(toKey(addDays(from, i)))
	return keys
}
type ReservaRow = { fecha_entrada: string; fecha_salida: string; personas: number | null }

/** Construye un mapa YYYY-MM-DD -> ocupación (personas ya reservadas) */
function buildDailyOccupancy(reservas: ReservaRow[]) {
	const occ = new Map<string, number>()
	for (const r of reservas) {
		const fe = parseISOstr(r.fecha_entrada)
		const fs = parseISOstr(r.fecha_salida)
		const p = Math.max(0, Number(r.personas ?? 0))
		if (!fe || !fs || p <= 0) continue
		for (let d = new Date(fe); d < fs; d = addDays(d, 1)) {
			const k = toKey(d)
			occ.set(k, (occ.get(k) ?? 0) + p)
		}
	}
	return occ
}

/** Detección de conflicto y sugerencia:
 *  - Devuelve el primer día en conflicto (si lo hay)
 *  - Y sugiere el primer FROM alternativo >= from que permita el mismo nº de noches sin superar capacidad.
 */
function findConflictAndSuggestion(
	occ: Map<string, number>,
	capacidad: number,
	fromISO: string,
	toISO: string,
	personas: number
): { conflictKey: string | null; suggestFrom: string | null } {
	const from = parseISOstr(fromISO)!
	const nights = nightsBetween(fromISO, toISO)
	if (nights <= 0) return { conflictKey: null, suggestFrom: null }

	const keys = rangeDatesKeys(from, nights)
	const conflictKey = keys.find(k => ((occ.get(k) ?? 0) + personas) > capacidad) ?? null
	if (!conflictKey) return { conflictKey: null, suggestFrom: null }

	// Probar desde el mismo 'from' en adelante: primera ventana contigua de 'nights' noches sin superar capacidad
	const MAX_LOOKAHEAD_DAYS = 365 // buscar hasta un año vista
	for (let shift = 1; shift <= MAX_LOOKAHEAD_DAYS; shift++) {
		const testFrom = addDays(from, shift)
		const testKeys = rangeDatesKeys(testFrom, nights)
		const ok = testKeys.every(k => ((occ.get(k) ?? 0) + personas) <= capacidad)
		if (ok) {
			return { conflictKey, suggestFrom: toKey(testFrom) }
		}
	}
	return { conflictKey, suggestFrom: null }
}

/* ========= Reserva payload ========= */
type ReservaInsert = {
	user_id: string
	alojamiento_id: number
	fecha_entrada: string
	fecha_salida: string
	personas: number
}

export default function AlojamientoDetalle() {
	const { id } = useParams<{ id: string }>()
	const alojId = Number(id)
	const nav = useNavigate()
	const { requireAuth } = useRequireAuth()

	const [aloj, setAloj] = useState<Alojamiento | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// Galería
	const [idx, setIdx] = useState(0)

	// Reserva
	const [range, setRange] = useState<DateRange>({ from: null, to: null })
	const [saving, setSaving] = useState(false)

	// Personas
	const [personas, setPersonas] = useState<number>(1)

	// Modal de pago simulado
	const [payOpen, setPayOpen] = useState(false)

	// Reseñas
	const [resenas, setResenas] = useState<Resena[]>([])
	const [avg, setAvg] = useState<number>(0)

	// Recomendados
	const [reco, setReco] = useState<Alojamiento[]>([])

	// Ocupación / Fechas bloqueadas duras (cuando ya está llena sin contar al usuario)
	const [dailyOcc, setDailyOcc] = useState<Map<string, number>>(new Map())
	const [hardDisabled, setHardDisabled] = useState<Set<string>>(new Set())

	// Estado de validación por capacidad según selección actual
	const [capacityErr, setCapacityErr] = useState<string | null>(null)
	const [suggestFrom, setSuggestFrom] = useState<string | null>(null)

	useEffect(() => {
		let mounted = true
			; (async () => {
				try {
					setLoading(true); setError(null)

					// 1) Alojamiento
					const a = await AlojamientoService.byId(alojId)
					if (!mounted) return
					setAloj(a)
					setIdx(0)

					// 2) Reservas del alojamiento -> mapa de ocupación + fechas duras deshabilitadas (ocupación >= capacidad)
					const cap = Number((a as any)?.capacidad ?? 0)
					const { data: reservas, error: rErr } = await supabase
						.from('reservas')
						.select('fecha_entrada, fecha_salida, personas')
						.eq('alojamiento_id', alojId)

					if (rErr) throw rErr
					const occ = buildDailyOccupancy((reservas ?? []) as ReservaRow[])
					if (!mounted) return
					setDailyOcc(occ)

					// Fechas "hard" deshabilitadas (sin contar al usuario): ocupación >= capacidad
					if (cap > 0) {
						const hard = new Set<string>()
						for (const [k, v] of occ) if (v >= cap) hard.add(k)
						setHardDisabled(hard)
					} else {
						setHardDisabled(new Set())
					}

					// 3) Reseñas y recomendados
					const [rs, todosAlojs] = await Promise.all([
						ResenaService.byAlojamiento(alojId).catch(() => [] as Resena[]),
						AlojamientoService.all().catch(() => [] as Alojamiento[]),
					])
					if (!mounted) return

					setResenas(rs)
					setAvg(rs.length ? Number((rs.reduce((s, r) => s + (Number(r.rating) || 0), 0) / rs.length).toFixed(2)) : 0)

					const lugarActual = (a as any)?.lugar as string | undefined
					const candidatos = todosAlojs
						.filter(x => x.id !== a.id && ((x as any)?.lugar || '').toLowerCase() === (lugarActual || '').toLowerCase())
						.slice(0, 3)
					setReco(candidatos)

				} catch (e: any) {
					if (!mounted) return
					setError(e?.message ?? 'Error cargando alojamiento')
				} finally {
					if (mounted) setLoading(false)
				}
			})()
		return () => { mounted = false }
	}, [alojId])

	const anyA = aloj as any
	const fotos = useMemo(() => !aloj ? [] as string[] : [anyA?.foto1, anyA?.foto2, anyA?.foto3, anyA?.foto4].filter(Boolean) as string[], [aloj])

	const nombre = aloj?.nombre ?? 'Alojamiento'
	const desc = aloj?.descripcion ?? 'Alojamiento recomendado cerca del mar.'
	const lugar = (anyA?.lugar as string | undefined) ?? (anyA?.direccion as string | undefined) ?? ''
	const precio = anyA?.costo as number | undefined
	const capacidad = (anyA?.capacidad as number | undefined) ?? null
	const maps = anyA?.maps as string | undefined
	const embedSrc = toEmbedSrc(maps, `${nombre} ${lugar}`.trim())

	// cobro por persona
	const noches = useMemo(() => nightsBetween(range.from, range.to), [range.from, range.to])
	const total = useMemo(() => (precio == null ? null : precio * noches * (personas || 1)), [precio, noches, personas])

	const prev = () => setIdx(i => (i - 1 + fotos.length) % fotos.length)
	const next = () => setIdx(i => (i + 1) % fotos.length)
	const goto = (i: number) => setIdx(i)

	// Validación por capacidad (en vivo)
	useEffect(() => {
		if (!range.from || !range.to || !capacidad || capacidad <= 0 || personas <= 0) {
			setCapacityErr(null)
			setSuggestFrom(null)
			return
		}
		const { conflictKey, suggestFrom } = findConflictAndSuggestion(dailyOcc, capacidad, range.from, range.to, personas)
		if (!conflictKey) {
			setCapacityErr(null)
			setSuggestFrom(null)
		} else {
			const [y, m, d] = conflictKey.split('-').map(Number)
			const conflictDate = new Date(y, (m - 1), d).toLocaleDateString('es-ES')
			const nightsTxt = noches === 1 ? '1 noche' : `${noches} noches`
			const baseMsg = `Tu selección supera la capacidad en la fecha ${conflictDate}.`
			setCapacityErr(suggestFrom
				? `${baseMsg} Disponible a partir del ${new Date(suggestFrom).toLocaleDateString('es-ES')} para ${nightsTxt} y ${personas} persona${personas > 1 ? 's' : ''}.`
				: `${baseMsg} No hay disponibilidad suficiente en los próximos días para ${nightsTxt} y ${personas} persona${personas > 1 ? 's' : ''}.`)
			setSuggestFrom(suggestFrom)
		}
	}, [range.from, range.to, personas, capacidad, dailyOcc, noches])

	const handleRangeChange = (dr: DateRange) => {
		// Reset de errores al cambiar fechas
		setCapacityErr(null)
		setSuggestFrom(null)
		setRange(dr)
	}

	const handlePersonasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const raw = Number(e.target.value || 1)
		const val = Math.max(1, raw)
		const max = capacidad ? Math.max(1, Math.floor(capacidad)) : val
		setPersonas(Math.min(val, max))
	}

	const applySuggestion = () => {
		if (!suggestFrom || !range.from || !range.to) return
		const nights = nightsBetween(range.from, range.to)
		const fromD = parseISOstr(suggestFrom)!
		const toD = addDays(fromD, nights)
		const toISO = toKey(toD)
		setRange({ from: suggestFrom, to: toISO })
	}

	const { requireAuth: requireAuthAndOpen } = useRequireAuth()

	const onReservarClick = (e: React.MouseEvent) => {
		e.preventDefault()
		if (!range.from || !range.to) return
		if (noches <= 0) return
		if (capacityErr) return // no dejar reservar con conflicto
		requireAuthAndOpen(() => setPayOpen(true))
	}

	const onConfirmPay = useCallback(async () => {
		if (!range.from || !range.to) throw new Error('Selecciona fecha de entrada y salida.')
		if (capacityErr) throw new Error('Tu selección supera la capacidad. Ajusta las fechas.')

		const { data: { session } } = await supabase.auth.getSession()
		const userId = session?.user?.id
		if (!userId) throw new Error('No hay sesión activa.')
		try {
			setSaving(true)
			const payload: ReservaInsert = {
				user_id: userId,
				alojamiento_id: alojId,
				fecha_entrada: range.from!,
				fecha_salida: range.to!,
				personas,
			}
			const { error } = await supabase.from('reservas').insert(payload)
			if (error) throw error
			setPayOpen(false)
			alert('¡Reserva creada correctamente!')
			nav('/login')
		} finally {
			setSaving(false)
		}
	}, [range.from, range.to, alojId, personas, nav, capacityErr])

	return (
		<main className="bw-alojd">
			<header className="bw-alojd__hero">
				<div className="container bw-alojd__heroInner">
					<div>
						<h1 className="bw-alojd__title">{nombre}</h1>
						<p className="bw-alojd__sub">{lugar || 'Ubicación no disponible'}</p>
					</div>
				</div>
			</header>

			{loading && <div className="container state">Cargando…</div>}
			{error && <div className="container state state--error">Error: {error}</div>}

			{!loading && !error && aloj && (
				<section className="container">
					<div className="bw-grid">
						{/* Thumbs */}
						<aside className="bw-thumbs" aria-label="Galería miniaturas">
							{fotos.length ? fotos.map((src, i) => (
								<button key={src + i} className={`bw-vthumb ${i === idx ? 'is-active' : ''}`} onClick={() => goto(i)} aria-label={`Ver imagen ${i + 1}`}>
									<img src={src} alt={`${nombre} miniatura ${i + 1}`} />
								</button>
							)) : <div className="bw-vthumb ph">🏨</div>}
						</aside>

						{/* Foto grande */}
						<div className="bw-photo">
							{fotos.length ? (
								<>
									<img key={fotos[idx]} src={fotos[idx]} alt={nombre} />
									{fotos.length > 1 && (
										<>
											<button className="bw-nav bw-nav--left" onClick={prev} aria-label="Anterior">‹</button>
											<button className="bw-nav bw-nav--right" onClick={next} aria-label="Siguiente">›</button>
										</>
									)}
								</>
							) : <div className="bw-ph">🏨</div>}
						</div>

						{/* Info */}
						<aside className="bw-info">
							<div className="bw-card bw-infoCard">
								<div className="bw-infoCard__header">
									<div className="bw-infoCard__stat"><span className="lbl">Valoración</span><span className="val">★ {avg || '—'}</span></div>
									<div className="bw-infoCard__stat"><span className="lbl">Desde</span><span className="val">{precio != null ? `${money(precio)} x pers` : '—'}</span></div>
									<div className="bw-infoCard__stat"><span className="lbl">Capacidad</span><span className="val">{capacidad ?? '—'}</span></div>
								</div>
								<div className="bw-infoCard__scroll">
									<p className="bw-desc">{desc}</p>
									<ul className="bw-featurelist">
										<li>Ubicación perfecta para desconectar cerca del mar.</li>
										<li>Atención personalizada y check-in flexible.</li>
										<li>Ideal para grupos de surf y escapadas en pareja.</li>
									</ul>
								</div>
							</div>
						</aside>

						{/* Reserva */}
						<div className="bw-reserve">
							<div className="bw-card bw-card--reserve">
								<h2 className="bw-card__title">Reserva</h2>

								{/* Fechas */}
								<div className="bw-reserve__inputs">
									<DateRangePicker
										value={range}
										onChange={handleRangeChange}
										disabledDates={hardDisabled}
										placeholderFrom="Entrada"
										placeholderTo="Salida"
									/>
								</div>

								{/* Personas + resumen + CTA */}
								{capacityErr && (
									<div className="auth__msg auth__msg--err bw-reserve__error">
										{capacityErr}
										{suggestFrom && (
											<div className="bw-reserve__suggest">
												<button type="button" className="btn btn--ghost" onClick={applySuggestion}>
													Usar fecha sugerida
												</button>
											</div>
										)}
									</div>
								)}

								<div className="bw-reserve__footer">
									<div className="bw-reserve__left" />
									<div className="bw-reserve__right">
										<div className="bw-personas-inline">
											<span className="bw-personas-inline__label">Personas</span>
											<input
												className="bw-personas-inline__input"
												type="number"
												min={1}
												max={capacidad ?? undefined}
												value={personas}
												onChange={handlePersonasChange}
												inputMode="numeric"
												placeholder="1"
											/>
										</div>

										<div className="bw-reserve__chip">
											<span className="label">Noches</span>
											<strong className="value">{noches || '—'}</strong>
										</div>
										<div className="bw-reserve__chip">
											<span className="label">Total</span>
											<strong className="value value--total">{total != null && noches > 0 ? money(total) : '—'}</strong>
										</div>

										<button className="btn btn--primary" onClick={onReservarClick} disabled={saving || !!capacityErr || !range.from || !range.to || noches <= 0}>
											{saving ? 'Guardando…' : 'Reservar'}
										</button>
									</div>
								</div>
							</div>
						</div>

						{/* Mapa */}
						<div className="bw-map">
							<div className="bw-card">
								<h2 className="bw-card__title">Ubicación</h2>
								<div className="bw-mapwrap">
									{embedSrc
										? <iframe src={embedSrc} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={`Mapa de ${nombre}`} />
										: <div className="bw-mapwrap__empty">No hay mapa disponible.</div>}
								</div>
							</div>
						</div>

						{/* Reseñas */}
						<div className="bw-reviews">
							<div className="bw-card bw-reviewsCard">
								<div className="bw-reviews__head">
									<h2 className="bw-card__title">Reseñas</h2>
									<div className="bw-reviews__meta">
										<span className="bw-reviews__avg">★ {avg || '—'}</span>
										<span className="bw-reviews__count">{resenas.length} reseña{resenas.length === 1 ? '' : 's'}</span>
									</div>
								</div>
								{resenas.length === 0 ? (
									<div className="bw-reviews__empty">Sé el primero en opinar.</div>
								) : (
									<ul className="bw-reviews__list">
										{resenas.map(r => (<li key={r.id}><ResenaCard item={r} /></li>))}
									</ul>
								)}
							</div>
						</div>

						{/* Recomendados */}
						<aside className="bw-recos">
							<div className="bw-card">
								<h2 className="bw-card__title">Más alojamientos</h2>
								{reco.length === 0 ? (
									<p className="bw-recos__empty">No hay más opciones en este lugar.</p>
								) : (
									<ul className="bw-recos__list">
										{reco.map(r => <li key={r.id}><RecoItem aloj={r} /></li>)}
									</ul>
								)}
							</div>
						</aside>
					</div>

					{/* MODAL de pago */}
					<PayReservationModal
						open={payOpen}
						onClose={() => setPayOpen(false)}
						onConfirm={onConfirmPay}
						resumen={{
							nombreAloj: nombre,
							from: range.from,
							to: range.to,
							noches,
							personas, // <- ya lo muestras en el resumen del modal
							totalFmt: total != null && noches > 0 ? money(total) : '—'
						}}
					/>
				</section>
			)}
		</main>
	)
}

function RecoItem({ aloj }: { aloj: Alojamiento }) {
	const anyA = aloj as any
	const foto = (anyA.foto1 || anyA.foto2 || anyA.foto3 || anyA.foto4) as string | undefined
	const precio = (anyA.costo as number | undefined) ?? null
	const lugar = (anyA.lugar as string | undefined) ?? (anyA.direccion as string | undefined) ?? ''
	return (
		<article className="bw-reco">
			<div className="bw-reco__media">{foto ? <img src={foto} alt={aloj.nombre} loading="lazy" /> : <div className="bw-reco__ph">🏨</div>}</div>
			<div className="bw-reco__body">
				<h4 className="bw-reco__title">{aloj.nombre}</h4>
				<div className="bw-reco__meta">{lugar && <span className="chip">{lugar}</span>}<span className="price">{precio != null ? money(precio) : '—'}</span></div>
				<Link className="btn btn--link btn--sm" to={`/alojamientos/${aloj.id}`}>Ver</Link>
			</div>
		</article>
	)
}
