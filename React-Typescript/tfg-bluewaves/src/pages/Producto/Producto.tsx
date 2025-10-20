// src/pages/Productos/Productos.tsx
import { useEffect, useMemo, useState } from 'react'
import { ProductosService, type Producto } from '../../services/productos'
import ProductoCard from '../../components/cards/ProductoCard'
import './Producto.css'

type Orden = 'relevancia' | 'precioAsc' | 'precioDesc' | 'populares'

// Helpers
const normaPrecio = (x: any): number => {
	const v = Number(x?.costo ?? x?.precio ?? 0)
	return Number.isFinite(v) ? v : 0
}

export default function Productos() {
	const [items, setItems] = useState<Producto[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	// Controles
	const [q, setQ] = useState('')
	const [orden, setOrden] = useState<Orden>('relevancia')
	const [minP, setMinP] = useState<string>('')
	const [maxP, setMaxP] = useState<string>('')

	useEffect(() => {
		let mounted = true
			; (async () => {
				try {
					setLoading(true)
					setError(null)
					const xs = await ProductosService.all().catch(() => [] as Producto[])
					if (!mounted) return
					setItems(xs)
				} catch (e: any) {
					if (!mounted) return
					setError(e?.message ?? 'Error cargando productos')
				} finally {
					if (mounted) setLoading(false)
				}
			})()
		return () => { mounted = false }
	}, [])

	const filas = useMemo(() => {
		let arr = [...items]

		// Texto
		const query = q.trim().toLowerCase()
		if (query) {
			arr = arr.filter(p =>
				(p.nombre || '').toLowerCase().includes(query) ||
				(p as any).descripcion?.toString().toLowerCase().includes(query)
			)
		}

		// Precio
		const min = Number(minP)
		const max = Number(maxP)
		if (!Number.isNaN(min)) arr = arr.filter(p => minP === '' ? true : normaPrecio(p) >= min)
		if (!Number.isNaN(max)) arr = arr.filter(p => maxP === '' ? true : normaPrecio(p) <= max)

		// Orden
		if (orden === 'precioAsc') arr.sort((a, b) => normaPrecio(a) - normaPrecio(b))
		else if (orden === 'precioDesc') arr.sort((a, b) => normaPrecio(b) - normaPrecio(a))
		else if (orden === 'populares') arr.sort((a: any, b: any) => (b.cant_comprada ?? 0) - (a.cant_comprada ?? 0))
		// relevancia => orden original

		return arr
	}, [items, q, minP, maxP, orden])

	const handleBuy = (prod: Producto) => {
		alert(`Añadido: ${prod.nombre}`)
	}

	return (
		<main className="prod">
			{/* HERO */}
			<header className="prod-hero">
				<div className="container prod-hero__inner">
					<div>
						<h1 className="prod-title">Productos</h1>
						<p className="prod-sub">Tablas, quillas, inventos, neoprenos y más — todo para tus olas.</p>
					</div>

					<form className="prod-filters" onSubmit={(e) => e.preventDefault()}>

						<div className="prod-price">
							<label>€ mín.
								<input inputMode="numeric" pattern="[0-9]*" value={minP} onChange={(e) => setMinP(e.target.value)} />
							</label>
							<label>€ máx.
								<input inputMode="numeric" pattern="[0-9]*" value={maxP} onChange={(e) => setMaxP(e.target.value)} />
							</label>
						</div>

						<label className="prod-select">
							Ordenar
							<select value={orden} onChange={(e) => setOrden(e.target.value as Orden)}>
								<option value="relevancia">Relevancia</option>
								<option value="populares">Populares</option>
								<option value="precioAsc">Precio ↑</option>
								<option value="precioDesc">Precio ↓</option>
							</select>
						</label>
					</form>
				</div>

				<div className="prod-wave" aria-hidden>
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
				<>
					{filas.length === 0 ? (
						<div className="container empty">
							<p>No hay resultados para los filtros seleccionados.</p>
						</div>
					) : (
						<section className="container prod-grid">
							{filas.map(p => (
								<div className="prod-item" key={p.id}>
									<ProductoCard item={p} onBuy={handleBuy} />
								</div>
							))}
						</section>
					)}
				</>
			)}
		</main>
	)
}
