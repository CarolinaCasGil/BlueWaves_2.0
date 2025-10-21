// src/pages/Actividades/PackReserva.tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import './PackReserva.css'

type Pack = {
	id: number
	titulo: string
	descripcion?: string | null
	costo?: number | null
	actividad_id?: number | null
	foto?: string | null
	cant_actv?: number | null
	cant_act?: number | null
	cantidad?: number | null
	[key: string]: any
}

type Hora = { id: number; hora_inicio: string; hora_fin: string }
type RangoDisp = { fecha: string; hora_id: number; capacidad: number; reservadas: number; disponibles: number }
type ClaseSel = { fecha: string | null; horaId: number | null }

/** Fila devuelta por el RPC `clase_disponibilidad` */
type RpcDisponibilidadRow = {
	hora_id?: number | null
	id?: number | null          // por si tu RPC devuelve `id` en lugar de `hora_id`
	disponibles?: number | null
}

const money = (v?: number | null) =>
	v == null ? '—' : new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)

const toISODate = (d: Date) => {
	const z = new Date(d); z.setHours(0, 0, 0, 0)
	const y = z.getFullYear(), m = `${z.getMonth() + 1}`.padStart(2, '0'), dd = `${z.getDate()}`.padStart(2, '0')
	return `${y}-${m}-${dd}`
}
const todayISO = () => toISODate(new Date())
const tomorrowISO = () => {
	const d = new Date()
	d.setDate(d.getDate() + 1)
	return toISODate(d)
}
const fmtDDMMYYYY = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}-${m}-${y}` }
const hhmm = (s: string) => s.slice(0, 5)
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0)
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1)

export default function PackReserva() {
	const { id } = useParams<{ id: string }>()
	const packId = Number(id)
	const nav = useNavigate()
	const { requireAuth } = useRequireAuth()

	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [err, setErr] = useState<string | null>(null)

	const [pack, setPack] = useState<Pack | null>(null)
	const [horas, setHoras] = useState<Hora[]>([])
	const [capacidadAct, setCapacidadAct] = useState<number | null>(null)

	const [personas, setPersonas] = useState<number>(1)

	const [selecciones, setSelecciones] = useState<ClaseSel[]>([])
	const [step, setStep] = useState<number>(0)

	const [selHoraId, setSelHoraId] = useState<number | null>(null)
	const [selFecha, setSelFecha] = useState<string | null>(null)
	const [stepErr, setStepErr] = useState<string | null>(null)

	const [monthBase, setMonthBase] = useState<Date>(startOfMonth(new Date()))
	const [monthDisp, setMonthDisp] = useState<Record<string, number>>({})
	const [monthLoading, setMonthLoading] = useState(false)

	const [editing, setEditing] = useState<boolean>(false)

	const selectedKeySet = useMemo(() => {
		const s = new Set<string>()
		for (const c of selecciones) {
			if (c.fecha && c.horaId) s.add(`${c.fecha}|${c.horaId}`)
		}
		return s
	}, [selecciones])

	const selectedKeySetExceptCurrent = useMemo(() => {
		const s = new Set<string>()
		selecciones.forEach((c, i) => {
			if (i === step) return
			if (c.fecha && c.horaId) s.add(`${c.fecha}|${c.horaId}`)
		})
		return s
	}, [selecciones, step])

	useEffect(() => {
		let mounted = true
			; (async () => {
				try {
					setLoading(true); setErr(null)

					const { data: pData, error: pErr } = await supabase
						.from('packs').select('*').eq('id', packId).maybeSingle()
					if (pErr) throw pErr
					if (!pData) throw new Error('Pack no encontrado')

					const p = pData as Pack
					if (!p.actividad_id) throw new Error('Este pack no tiene vinculada una actividad.')
					setPack(p)

					const cant = Math.max(1, Number(p.cant_actv ?? p.cant_act ?? p.cantidad ?? 1))
					setSelecciones(Array.from({ length: cant }, () => ({ fecha: null, horaId: null })))

					const { data: hData, error: hErr } = await supabase
						.from('actividad_horas')
						.select('id,hora_inicio,hora_fin')
						.eq('actividad_id', p.actividad_id)
						.order('hora_inicio', { ascending: true })
					if (hErr) throw hErr
					setHoras((hData || []) as Hora[])

					const { data: capData, error: capErr } = await supabase
						.from('actividades')
						.select('capacidad')
						.eq('id', p.actividad_id)
						.maybeSingle()
					if (capErr) throw capErr
					setCapacidadAct(capData?.capacidad ?? null)

					setStep(0); setSelHoraId(null); setSelFecha(null)
					setMonthBase(startOfMonth(new Date()))
					setMonthDisp({})
					setEditing(true)
				} catch (e: any) {
					if (mounted) setErr(e?.message ?? 'Error cargando el pack')
				} finally {
					if (mounted) setLoading(false)
				}
			})()
		return () => { mounted = false }
	}, [packId])

	const costoPackTotal = pack?.costo ?? 0
	const total = useMemo(() => costoPackTotal * (personas || 1), [costoPackTotal, personas])

	const allFilled = useMemo(() => selecciones.every(s => s.fecha && s.horaId), [selecciones])

	useEffect(() => {
		let mounted = true
			; (async () => {
				setStepErr(null)
				setSelFecha(null)
				setMonthDisp({})
				if (!pack?.actividad_id || !selHoraId) return

				const desdeISO = toISODate(startOfMonth(monthBase))
				const hastaISO = toISODate(endOfMonth(monthBase))

				try {
					setMonthLoading(true)
					const { data: rpcRowsAny, error } = await supabase.rpc(
						'clase_disponibilidad_rango',
						{
							p_actividad_id: pack.actividad_id,
							p_hora_id: selHoraId,
							p_desde: desdeISO,
							p_hasta: hastaISO
						}
					)
					const rpcRows = (rpcRowsAny ?? []) as RangoDisp[]
					if (error) throw error

					const lista: RangoDisp[] = rpcRows ?? []
					const map: Record<string, number> = {}
					for (const r of lista) {
						const f = typeof r.fecha === 'string' ? r.fecha : toISODate(new Date(r.fecha))
						map[f] = Number(r.disponibles || 0)
					}
					if (!mounted) return
					setMonthDisp(map)
				} catch (e: any) {
					if (!mounted) return
					setMonthDisp({})
					setStepErr(e?.message ?? 'No se pudo cargar la disponibilidad del mes.')
				} finally {
					if (mounted) setMonthLoading(false)
				}
			})()
		return () => { mounted = false }
	}, [pack?.actividad_id, selHoraId, monthBase])

	const onPersonasChange = (raw: number) => {
		const val = Math.max(1, Number(raw || 1))
		if (capacidadAct && val > capacidadAct) {
			setPersonas(capacidadAct)
			setStepErr(`La actividad admite como máximo ${capacidadAct} personas por clase.`)
			if (selFecha && monthDisp[selFecha] != null && monthDisp[selFecha] < capacidadAct) {
				setSelFecha(null)
			}
			return
		}
		setPersonas(val)
		if (selFecha && monthDisp[selFecha] != null && monthDisp[selFecha] < val) {
			setSelFecha(null)
			setStepErr(`Para ese día solo quedan ${monthDisp[selFecha]} plazas.`)
		} else {
			setStepErr(null)
		}
	}

	const guardarClaseYSiguiente = () => {
		setStepErr(null)
		if (!selHoraId) { setStepErr('Elige una hora.'); return }
		if (!selFecha) { setStepErr('Elige un día disponible.'); return }

		const key = `${selFecha}|${selHoraId}`
		if (selectedKeySetExceptCurrent.has(key)) {
			setStepErr('Ya has elegido esa combinación de día y hora para otra clase.')
			return
		}

		setSelecciones(prev => {
			const next = [...prev]
			next[step] = { fecha: selFecha!, horaId: selHoraId! }

			const filled = next.every(s => s.fecha && s.horaId)
			if (filled) setEditing(false)
			else if (step < next.length - 1) {
				setStep(step + 1)
				setSelHoraId(null)
				setSelFecha(null)
				setMonthBase(startOfMonth(new Date()))
				setMonthDisp({})
			}
			return next
		})
	}

	const editarClase = (i: number) => {
		const curr = selecciones[i]
		setStep(i)
		setSelHoraId(curr.horaId)
		setSelFecha(curr.fecha)
		if (curr.fecha) {
			const [y, m] = curr.fecha.split('-').map(Number)
			setMonthBase(new Date(y, (m - 1), 1))
		}
		setEditing(true)
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	const confirmarPagoYReservar = async () => {
		for (let i = 0; i < selecciones.length; i++) {
			const s = selecciones[i]
			if (!s.fecha || !s.horaId) {
				alert(`Te falta completar la clase #${i + 1}`)
				return
			}
		}

		requireAuth(async () => {
			try {
				setSaving(true)
				const { data: sessionRes } = await supabase.auth.getSession()
				const userId = sessionRes?.session?.user?.id
				if (!userId) throw new Error('No hay sesión activa')
				if (!pack?.actividad_id) throw new Error('Pack sin actividad vinculada')

				// Revalidación final por día (TIPADO EXPLÍCITO AQUÍ)
				const fechasUnicas: string[] = Array.from(new Set(selecciones.map(s => s.fecha!).filter(Boolean)))
				const mapa: Record<string, Record<number, number>> = {}

				for (const f of fechasUnicas) {
					const { data: rowsAny, error: rpcErr } = await supabase.rpc(
						'clase_disponibilidad',
						{
							p_actividad_id: pack.actividad_id,
							p_fecha: f
						} as any
					)
					const rows = (rowsAny ?? []) as RpcDisponibilidadRow[]
					if (rpcErr) throw rpcErr

					const arr: RpcDisponibilidadRow[] = rows ?? []
					const bucket: Record<number, number> = {}
					for (const r of arr) {
						const hid = Number((r.hora_id ?? r.id) ?? 0)
						const disp = Number(r.disponibles ?? 0)
						if (hid) bucket[hid] = disp
					}
					mapa[f] = bucket
				}

				for (let i = 0; i < selecciones.length; i++) {
					const s = selecciones[i]
					const disp = (mapa[s.fecha!] ?? {})[s.horaId!]
					if (disp == null || disp < (personas || 1)) {
						throw new Error(`La clase #${i + 1} ya no tiene suficientes plazas en ${fmtDDMMYYYY(s.fecha!)} (quedan ${disp ?? 0}).`)
					}
				}

				const filas = selecciones.map(s => ({
					user_id: userId,
					pack_id: pack!.id,
					fecha: s.fecha!,
					hora_id: s.horaId!,
					cant_pers: personas
				}))
				const { error } = await supabase.from('user_packs').insert(filas)
				if (error) throw error

				alert('¡Reserva de pack realizada! (pago simbólico)')
				nav('/login')
			} catch (e: any) {
				alert(e?.message ?? 'No se pudo completar la reserva')
			} finally {
				setSaving(false)
			}
		})
	}

	const monthDaysGrid = useMemo(() => {
		const start = startOfMonth(monthBase)
		const end = endOfMonth(monthBase)
		const startWeekday = (start.getDay() + 6) % 7
		const totalDays = end.getDate()
		const cells: ({ iso: string, num: number } | null)[] = []
		for (let i = 0; i < startWeekday; i++) cells.push(null)
		for (let i = 1; i <= totalDays; i++) {
			const d = new Date(monthBase.getFullYear(), monthBase.getMonth(), i)
			cells.push({ iso: toISODate(d), num: i })
		}
		return cells
	}, [monthBase])

	const showWizard = editing || !allFilled

	return (
		<main className="packres">
			<header className="packres__hero">
				<div className="container packres__heroInner">
					<h1 className="packres__title">Reservar pack</h1>
					{pack && <p className="packres__sub">{pack.titulo}</p>}
				</div>
			</header>

			{loading && <div className="container state">Cargando…</div>}
			{err && <div className="container state state--error">Error: {err}</div>}

			{!loading && !err && pack && (
				<section className="container packres__wrap">
					<div className="packres__grid">

						{/* IZQUIERDA: Wizard */}
						{showWizard ? (
							<article className="packres-card">
								<div className="packres-steps">
									<div className="packres-steps__title">
										Clase #{step + 1} de {selecciones.length}
									</div>
									<div className="packres-steps__subtitle">
										Elige primero la <strong>hora</strong> y después un <strong>día disponible</strong>.
									</div>
								</div>

								<div className="packres__people">
									<label className="auth__label">
										Personas
										<input
											type="number"
											min={1}
											max={capacidadAct ?? undefined}
											value={personas}
											onChange={e => onPersonasChange(Number(e.target.value))}
											inputMode="numeric"
										/>
									</label>
									{capacidadAct != null && (
										<div className="packres-help">Capacidad máx. por clase: {capacidadAct}</div>
									)}
								</div>

								<div className="packres__hora">
									<label className="auth__label">
										Hora
										<select
											value={selHoraId ?? ''}
											onChange={e => setSelHoraId(e.target.value ? Number(e.target.value) : null)}
										>
											<option value="" disabled>Selecciona una hora</option>
											{horas.map(h => (
												<option key={h.id} value={h.id}>
													{hhmm(h.hora_inicio)}–{hhmm(h.hora_fin)}
												</option>
											))}
										</select>
									</label>
								</div>

								{selHoraId && (
									<div className="packres-month">
										<div className="packres-month__toolbar">
											<button
												className="packres-month__btn"
												onClick={() => setMonthBase(addMonths(monthBase, -1))}
												aria-label="Mes anterior"
											>
												‹
											</button>
											<div className="packres-month__title">
												{monthBase.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
											</div>
											<button
												className="packres-month__btn"
												onClick={() => setMonthBase(addMonths(monthBase, 1))}
												aria-label="Mes siguiente"
											>
												›
											</button>
										</div>

										<div className="bw-dp__grid">
											{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <div className="bw-dp__dow" key={d}>{d}</div>)}

											{monthDaysGrid.map((cell, i) => {
												if (!cell) return <div className="bw-dp__cell is-empty" key={`e${i}`} />
												const iso = cell.iso
												const isPast = iso < tomorrowISO()
												const hasData = Object.prototype.hasOwnProperty.call(monthDisp, iso)
												const disp = monthDisp[iso]
												const duplicateForThisHour = selectedKeySetExceptCurrent.has(`${iso}|${selHoraId}`)
												const ok = hasData ? disp >= (personas || 1) : false
												const disabled = !ok || isPast || duplicateForThisHour

												const classes = [
													'bw-dp__cell',
													monthLoading && 'is-loading',
													disabled && 'is-disabled',
													selFecha === iso && 'is-from'
												].filter(Boolean).join(' ')

												return (
													<button
														type="button"
														key={iso}
														className={classes}
														onClick={() => disabled ? undefined : setSelFecha(iso)}
														disabled={disabled || monthLoading}
														title={
															duplicateForThisHour ? 'Ya elegiste esta combinación día+hora' :
																monthLoading ? 'Cargando…' :
																	!ok ? 'Completo' :
																		`${fmtDDMMYYYY(iso)} · disp: ${disp}`
														}
													>
														<div className="daynum">{cell.num}</div>
													</button>
												)
											})}
										</div>
									</div>
								)}

								{stepErr && <div className="packres-msg packres-msg--err">{stepErr}</div>}

								<div className="packres__ctas">
									<button className="btn btn--primary" onClick={guardarClaseYSiguiente} disabled={!selHoraId || !selFecha}>
										{step === selecciones.length - 1 ? 'Guardar clase' : 'Guardar clase y siguiente'}
									</button>
								</div>
							</article>
						) : (
							<article className="packres-card packres-card--done">
								<h2 className="packres-card__title">Clases completadas</h2>
								<p>Ya has seleccionado todas las clases. Puedes revisarlas a la derecha y completar la reserva.</p>
							</article>
						)}

						{/* DERECHA: resumen + pagar */}
						<aside className="packres-card packres-card--summary">
							<h2 className="packres-card__title">Resumen</h2>

							<ul className="packres-summary">
								{selecciones.map((s, i) => {
									const h = horas.find(x => x.id === s.horaId)
									return (
										<li key={i} className="packres-summary__item">
											<div className="packres-summary__left">
												<div className="packres-summary__title">Clase #{i + 1}</div>
												<div className="packres-summary__meta">
													<span>{s.fecha ? fmtDDMMYYYY(s.fecha) : '—'}</span>
													<span>·</span>
													<span>{h ? `${hhmm(h.hora_inicio)}–${hhmm(h.hora_fin)}` : '—'}</span>
												</div>
											</div>
											<div className="packres-summary__right">
												<button className="btn btn--ghost btn--sm" onClick={() => editarClase(i)}>Editar</button>
											</div>
										</li>
									)
								})}
							</ul>

							<div className="packres-divider" />

							<div className="packres-row">
								<div className="packres-row__label">Precio pack (total)</div>
								<div className="packres-row__value">{money(pack.costo)}</div>
							</div>
							<div className="packres-row">
								<div className="packres-row__label">Personas</div>
								<div className="packres-row__value">{personas}</div>
							</div>

							<div className="packres-total">
								<div className="packres-total__label">Total</div>
								<div className="packres-total__value">{money(total)}</div>
							</div>

							<div className="packres__ctas packres__ctas--end">
								<button
									className="btn btn--primary"
									onClick={confirmarPagoYReservar}
									disabled={saving || !allFilled}
								>
									{saving ? 'Procesando…' : 'Pagar y reservar'}
								</button>
							</div>

							<p className="packres-note">
								Pago simbólico (no real). Duplicados bloqueados y disponibilidad revalidada antes de guardar.
							</p>
						</aside>
					</div>
				</section>
			)}
		</main>
	)
}
