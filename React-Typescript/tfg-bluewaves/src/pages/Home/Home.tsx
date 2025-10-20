import { useEffect, useMemo, useState } from 'react'
import { PackService, type Pack } from '../../services/packs'
import { AlojamientoService, type Alojamiento } from '../../services/alojamientos'
import Hero from '../../components/Hero/Hero'
import PackCard from '../../components/cards/PackCard'
import AlojamientoCard from '../../components/cards/AlojamientoCard'
import './Home.css'

function shufflePick<T>(arr: T[], n: number) {
	if (!arr?.length) return []
	const copy = [...arr]
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
			;[copy[i], copy[j]] = [copy[j], copy[i]]
	}
	return copy.slice(0, n)
}

export default function Home() {
	const [packs, setPacks] = useState<Pack[]>([])
	const [alojamientos, setAlojamientos] = useState<Alojamiento[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let mounted = true
			; (async () => {
				try {
					setLoading(true)
					setError(null)
					const [ps, as] = await Promise.all([PackService.all(), AlojamientoService.all()])
					if (!mounted) return
					setPacks(ps)
					setAlojamientos(as)
				} catch (e: any) {
					if (!mounted) return
					setError(e?.message ?? 'Error cargando datos')
				} finally {
					if (mounted) setLoading(false)
				}
			})()
		return () => { mounted = false }
	}, [])

	// Lugares únicos ordenados A→Z (para el select del Hero)
	const uniquePlaces = useMemo(() => {
		const values = alojamientos.map(a => (a.lugar ?? '').trim()).filter(Boolean)
		return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
	}, [alojamientos])

	const offerPacks = useMemo(() => shufflePick(packs, 4), [packs])
	const offerAlojs = useMemo(() => shufflePick(alojamientos, 3), [alojamientos])

	const handleHeroSearch = (payload: { place: string; from: string; to: string }) => {
		console.log('Buscar:', payload)
	}

	return (
		<main className="home">
			{/* HERO full-screen */}
			<Hero uniquePlaces={uniquePlaces} onSearch={handleHeroSearch} />

			{/* ESTADOS */}
			{loading && <div className="container state">Cargando ofertas…</div>}
			{error && <div className="container state state--error">Error: {error}</div>}

			{/* OFERTAS: PACKS */}
			{!loading && !error && offerPacks.length > 0 && (
				<section className="section" id="ofertas-packs">
					<div className="container section__header">
						<div>
							<h2 className="section__title">Ofertas en Packs</h2>
						</div>
						<a href="/actividades" className="link">Ver todos →</a>
					</div>

					<div className="container grid grid--4">
						{offerPacks.map((p) => <PackCard key={p.id} pack={p} />)}
					</div>
				</section>
			)}

			{/* OFERTAS: ALOJAMIENTOS */}
			{!loading && !error && offerAlojs.length > 0 && (
				<section className="section">
					<div className="container section__header">
						<div>
							<h2 className="section__title">Ofertas en Alojamientos</h2>
						</div>
						<a href="/alojamientos" className="link">Ver todos →</a>
					</div>

					<div className="container grid grid--3">
						{offerAlojs.map((a) => <AlojamientoCard key={a.id} item={a} />)}
					</div>
				</section>
			)}
		</main>
	)
}
