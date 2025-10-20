import { useEffect, useMemo, useState } from 'react'
import { AlojamientoService, type Alojamiento } from '../../services/alojamientos'
import AlojamientoCard from '../../components/cards/AlojamientoCard'
import './Alojamientos.css'

type Order = 'precioAsc' | 'precioDesc'

export default function Alojamientos() {
	const [items, setItems] = useState<Alojamiento[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// Controles
	const [place, setPlace] = useState<string>('')
	const [order, setOrder] = useState<Order>('precioAsc')

	useEffect(() => {
		let mounted = true
			; (async () => {
				try {
					setLoading(true)
					setError(null)
					const data = await AlojamientoService.all()
					if (!mounted) return
					setItems(data)
				} catch (e: any) {
					if (!mounted) return
					setError(e?.message ?? 'Error cargando alojamientos')
				} finally {
					if (mounted) setLoading(false)
				}
			})()
		return () => { mounted = false }
	}, [])

	const uniquePlaces = useMemo(() => {
		const set = new Set<string>()
		for (const a of items) {
			const anyA = a as any
			const p = (anyA.lugar as string | undefined)?.trim()
			if (p) set.add(p)
		}
		return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))
	}, [items])

	const filtered = useMemo(() => {
		let arr = [...items]
		if (place) {
			arr = arr.filter(a => ((a as any).lugar || '').toLowerCase() === place.toLowerCase())
		}
		if (order === 'precioAsc') {
			arr.sort((a: any, b: any) => (a.costo ?? Infinity) - (b.costo ?? Infinity))
		} else {
			arr.sort((a: any, b: any) => (b.costo ?? 0) - (a.costo ?? 0))
		}
		return arr
	}, [items, place, order])

	return (
		<main className="aloj-page">
			{/* HERO */}
			<header className="aloj-hero">
				<div className="container aloj-hero__inner">
					<div>
						<h1 className="aloj-title">Alojamientos</h1>
						<p className="aloj-sub">Elige tu base junto al mar y ¡a surfear!</p>
					</div>

					<div className="aloj-controls">
						<label className="selectlabel">
							Lugar:
							<select value={place} onChange={(e) => setPlace(e.target.value)}>
								<option value="">Todos</option>
								{uniquePlaces.map(p => <option key={p} value={p}>{p}</option>)}
							</select>
						</label>

						<label className="selectlabel">
							Ordenar:
							<select value={order} onChange={(e) => setOrder(e.target.value as Order)}>
								<option value="precioAsc">Precio ↑</option>
								<option value="precioDesc">Precio ↓</option>
							</select>
						</label>
					</div>
				</div>

				<div className="aloj-wave" aria-hidden>
					<svg viewBox="0 0 1440 120" preserveAspectRatio="none">
						<path d="M0,64 C240,120 480,8 720,40 C960,72 1200,120 1440,72 L1440,120 L0,120 Z" />
					</svg>
				</div>
			</header>

			{/* ESTADOS */}
			{loading && <div className="container state">Cargando…</div>}
			{error && <div className="container state state--error">Error: {error}</div>}

			{/* GRID */}
			{!loading && !error && (
				filtered.length === 0 ? (
					<div className="container empty">
						<p>No encontramos alojamientos para tus filtros.</p>
						<button
							className="btn btn--ghost"
							onClick={() => { setPlace(''); setOrder('precioAsc') }}
						>
							Limpiar filtros
						</button>
					</div>
				) : (
					<section className="container aloj-grid">
						{filtered.map(a => (
							<AlojamientoCard key={a.id} item={a} auto={false} />
						))}
					</section>
				)
			)}
		</main>
	)
}
