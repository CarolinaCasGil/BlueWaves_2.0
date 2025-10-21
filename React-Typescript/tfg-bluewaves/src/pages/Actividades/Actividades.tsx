import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ActividadesService, type Actividad } from '../../services/actividades'
import ActividadDetalle from './ActividadDetalle'
import './Actividades.css'

function money(v?: number | null) {
	if (v == null) return '—'
	return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
}

function median(nums: number[]) {
	if (!nums.length) return 0
	const arr = [...nums].sort((a, b) => a - b)
	const mid = Math.floor(arr.length / 2)
	return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2
}

export default function Actividades() {
	const [items, setItems] = useState<Actividad[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const [q, setQ] = useState('')
	const [order, setOrder] = useState<'az' | 'precio' | 'capacidad'>('precio')
	const [showPromo, setShowPromo] = useState(true)

	useEffect(() => {
		let mounted = true
			; (async () => {
				try {
					setLoading(true)
					setError(null)
					const acts = await ActividadesService.all()
					if (!mounted) return
					setItems(acts)
				} catch (e: any) {
					if (!mounted) return
					setError(e?.message ?? 'Error cargando actividades')
				} finally {
					if (mounted) setLoading(false)
				}
			})()
		return () => { mounted = false }
	}, [])

	// métricas para badges
	const stats = useMemo(() => {
		const precios = items.map((a: any) => Number(a.costo ?? 0)).filter(n => Number.isFinite(n) && n > 0)
		const caps = items.map((a: any) => Number(a.capacidad ?? 0)).filter(n => Number.isFinite(n) && n > 0)
		return {
			priceMedian: median(precios),
			capMedian: median(caps),
		}
	}, [items])

	const filtered = useMemo(() => {
		let arr = [...items]
		const query = q.trim().toLowerCase()
		if (query) {
			arr = arr.filter(a =>
				a.nombre.toLowerCase().includes(query) ||
				(a.descripcion || '').toLowerCase().includes(query)
			)
		}
		if (order === 'az') {
			arr.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
		} else if (order === 'precio') {
			arr.sort((a: any, b: any) => (a.costo ?? Infinity) - (b.costo ?? Infinity))
		} else if (order === 'capacidad') {
			arr.sort((a: any, b: any) => (b.capacidad ?? 0) - (a.capacidad ?? 0))
		}
		return arr
	}, [items, q, order])

	return (
		<main className="acts2-page">
			<header className="acts2-hero">
				<div className="container acts2-hero__inner">
					<div>
						<h1 className="acts2-title">Actividades</h1>
						<p className="acts2-sub">Elige tu plan, súmate a la ola y reserva en segundos.</p>
					</div>
					<div className="acts2-controls">
						<div className="searchbox">
							<input
								type="text"
								placeholder="Buscar actividad…"
								value={q}
								onChange={(e) => setQ(e.target.value)}
								aria-label="Buscar actividad"
							/>
							{q && <button className="clear" onClick={() => setQ('')} aria-label="Limpiar búsqueda">×</button>}
						</div>
						<label className="sortlabel">
							Ordenar:
							<select value={order} onChange={(e) => setOrder(e.target.value as any)}>
								<option value="precio">Mejor precio</option>
								<option value="capacidad">Mayor capacidad</option>
								<option value="az">A → Z</option>
							</select>
						</label>
					</div>
				</div>
				<div className="acts2-wave" aria-hidden>
					<svg viewBox="0 0 1440 120" preserveAspectRatio="none">
						<path d="M0,64 C240,120 480,8 720,40 C960,72 1200,120 1440,72 L1440,120 L0,120 Z" />
					</svg>
				</div>
			</header>

			{loading && <div className="container state">Cargando…</div>}
			{error && <div className="container state state--error">Error: {error}</div>}

			{!loading && !error && (
				<section className="container container--wide acts2-grid">
					{filtered.map((a) => {
						const anyA = a as any
						const foto = anyA.foto as string | undefined
						const precio = (anyA.costo as number | undefined) ?? null
						const cap = (anyA.capacidad as number | undefined) ?? null

						const isDeal = stats.priceMedian ? (precio ?? Infinity) <= stats.priceMedian : false
						const isGroup = stats.capMedian ? (cap ?? 0) >= stats.capMedian : false

						return (
							<article key={a.id} className="actcard">
								<div className="actcard__media">
									{foto ? <img src={foto} alt={a.nombre} loading="lazy" /> : <div className="actcard__ph">🌊</div>}
									<div className="actcard__overlay" />
								</div>

								<div className="actcard__body">
									<div className="actcard__head">
										<h3 className="actcard__title">{a.nombre}</h3>
										<div className="badges">
											{isDeal && <span className="badge badge--deal">Ahorro</span>}
											{isGroup && <span className="badge badge--group">Ideal grupos</span>}
										</div>
									</div>

									<p className="actcard__desc">{a.descripcion ?? 'Experiencia junto al mar con instructores certificados.'}</p>

									<div className="chips">
										{precio != null && <span className="chip">Desde {money(precio)}</span>}
										{cap != null && <span className="chip">Capacidad {cap} por clase</span>}
									</div>
								</div>

								<div className="actcard__footer">
									<div className="actcard__ctas">
										<Link to={`/actividades/${a.id}`} className="btn btn--primary btn--sm">¡Reserva ahora!</Link>
									</div>
								</div>
							</article>
						)
					})}
				</section>
			)}

			{!loading && !error && filtered.length === 0 && (
				<div className="container empty">
					<p>No encontramos actividades para <strong>{q || 'tu búsqueda'}</strong>.</p>
					<button className="btn btn--ghost" onClick={() => { setQ(''); setOrder('precio') }}>Limpiar filtros</button>
				</div>
			)}
		</main>
	)
}
