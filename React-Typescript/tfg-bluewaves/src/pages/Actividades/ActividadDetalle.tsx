import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PackService, type Pack } from '../../services/packs'
import { ActividadesService, type Actividad } from '../../services/actividades'
import { AlojamientoService, type Alojamiento } from '../../services/alojamientos'
import './ActividadDetalle.css'

function getActividadIdFromPack(p: Pack): number | null {
	const anyPack = p as any
	return (Number(anyPack.actividad_id ?? anyPack.avtividad_id) || null)
}
function getActividadIdFromAloj(a: Alojamiento): number | null {
	const anyAloj = a as any
	return (Number(anyAloj.actividad_id ?? anyAloj.avtividad_id) || null)
}
function money(v?: number | null) {
	if (v == null) return '—'
	return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
}

export default function ActividadDetalle() {
	const { id } = useParams<{ id: string }>()
	const actividadId = Number(id)

	const [packs, setPacks] = useState<Pack[]>([])
	const [alojamientos, setAlojamientos] = useState<Alojamiento[]>([])
	const [actividad, setActividad] = useState<Actividad | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let mounted = true
			; (async () => {
				try {
					setLoading(true)
					setError(null)
					const [ps, act, aloj] = await Promise.all([
						PackService.all(),
						ActividadesService.byId(actividadId).catch(() => null),
						AlojamientoService.all().catch(() => [] as Alojamiento[]),
					])
					if (!mounted) return
					setPacks(ps)
					setActividad(act)
					setAlojamientos(aloj)
				} catch (e: any) {
					if (!mounted) return
					setError(e?.message ?? 'Error cargando la actividad')
				} finally {
					if (mounted) setLoading(false)
				}
			})()
		return () => { mounted = false }
	}, [actividadId])

	const packsForActivity = useMemo(
		() => packs.filter((p) => getActividadIdFromPack(p) === actividadId),
		[packs, actividadId]
	)

	const alojForActivity = useMemo(() => {
		const direct = alojamientos.filter((a) => getActividadIdFromAloj(a) === actividadId)
		if (direct.length > 0) return direct
		const packIds = new Set(packsForActivity.map((p) => p.id))
		return alojamientos.filter((a) => {
			const anyA = a as any
			const packId = Number(anyA.pack_id ?? anyA.id_pack)
			return packId && packIds.has(packId)
		})
	}, [alojamientos, packsForActivity, actividadId])

	const title = actividad?.nombre ?? 'Actividad'
	const subtitle = actividad?.descripcion ?? 'Explora los packs disponibles'
	const heroPhoto = (actividad as any)?.foto as string | undefined
	const precioDesde = useMemo(() => {
		const precios = packsForActivity.map((p: any) => Number(p.costo ?? 0)).filter(Boolean)
		return precios.length ? Math.min(...precios) : null
	}, [packsForActivity])

	return (
		<main className="actd">
			<header className="actd-hero">
				<div className="actd-hero__bg">
					{heroPhoto ? <img src={heroPhoto} alt={title} /> : <div className="actd-hero__ph" aria-hidden>🌊</div>}
					<div className="actd-hero__overlay" />
				</div>

				<div className="container actd-hero__inner">
					<div className="actd-hero__text">
						<h1 className="actd-title">{title}</h1>
						<p className="actd-sub">{subtitle}</p>

					</div>
				</div>

				<div className="actd-wave" aria-hidden>
					<svg viewBox="0 0 1440 120" preserveAspectRatio="none">
						<path d="M0,64 C240,120 480,8 720,40 C960,72 1200,120 1440,72 L1440,120 L0,120 Z" />
					</svg>
				</div>
			</header>

			<section className="container list" id="packs">
				<div className="list__head">
					<h2 className="list__title">Packs disponibles</h2>
				</div>

				{loading && (
					<div className="list__skeletons">
						{Array.from({ length: 4 }).map((_, i) => (
							<div className="tile skeleton" key={i}>
								<div className="ph ph--img" />
								<div className="ph ph--line" />
								<div className="ph ph--line sm" />
							</div>
						))}
					</div>
				)}

				{error && <div className="state state--error">Error: {error}</div>}

				{!loading && !error && packsForActivity.length === 0 && (
					<div className="state">No hay packs para esta actividad.</div>
				)}

				{!loading && !error && packsForActivity.length > 0 && (
					<div className="tiles">
						{packsForActivity.map((p) => <PackTile key={p.id} p={p} />)}
					</div>
				)}
			</section>

			<section className="container aloj">
				<div className="list__head">
					<h2 className="list__title">Alojamientos para esta actividad</h2>
				</div>

				{loading && (
					<div className="aloj-grid">
						{Array.from({ length: 6 }).map((_, i) => (
							<div className="alojcard skeleton" key={i}>
								<div className="ph ph--img" />
								<div className="ph ph--line" />
								<div className="ph ph--line sm" />
							</div>
						))}
					</div>
				)}

				{!loading && !error && alojForActivity.length === 0 && (
					<div className="state">No hay alojamientos vinculados a esta actividad.</div>
				)}

				{!loading && !error && alojForActivity.length > 0 && (
					<div className="aloj-grid">
						{alojForActivity.map((a) => <AlojCard key={a.id} a={a} />)}
					</div>
				)}
			</section>
		</main>
	)
}

function PackTile({ p }: { p: Pack }) {
	const foto = (p as any).foto as string | undefined
	const acts = (p as any).cantidad_actividad as number | undefined
	const precio = (p as any).costo as number | undefined

	return (
		<article className="tile">
			<div className="tile__media">
				{foto ? <img src={foto} alt={p.titulo} loading="lazy" /> : <div className="tile__ph">🌊</div>}
			</div>

			<div className="tile__body">
				<h3 className="tile__title">{p.titulo}</h3>
				<p className="tile__desc">{p.descripcion ?? 'Pack de aventura frente al mar.'}</p>
				<div className="tile__chips">
					{typeof acts === 'number' && <span className="chip">{acts} actividades</span>}
				</div>
			</div>

			<div className="tile__cta">
				<div className="tile__price">{typeof precio === 'number' ? money(precio) : '—'}</div>
				<Link to={`/packs/${p.id}/reservar`} className="btn btn--primary btn--sm">
					Reservar pack
				</Link>

			</div>
		</article>
	)
}

function AlojCard({ a }: { a: Alojamiento }) {
	const anyA = a as any
	const fotos = [anyA.foto1, anyA.foto2, anyA.foto3, anyA.foto4].filter(Boolean) as string[]
	const foto = fotos[0]
	const precio = (anyA.costo as number | undefined) ?? null
	const capacidad = (anyA.capacidad as number | undefined) ?? null
	const lugar = (anyA.lugar as string | undefined) ?? (anyA.direccion as string | undefined)

	return (
		<article className="alojcard">
			<div className="alojcard__media">
				{foto ? <img src={foto} alt={a.nombre} loading="lazy" /> : <div className="alojcard__ph"></div>}
			</div>

			<div className="alojcard__body">
				<h3 className="alojcard__title">{a.nombre}</h3>
				<p className="alojcard__desc">{a.descripcion ?? 'Alojamiento recomendado para la actividad.'}</p>
				<div className="alojcard__chips">
					{lugar && <span className="chip">{lugar}</span>}
				</div>
			</div>

			<div className="alojcard__footer">
				<div className="alojcard__price">{precio != null ? money(precio) : '—'}</div>
				<Link className="btn btn--primary btn--sm" to={`/alojamientos/${a.id}`}>Reservar</Link>
			</div>
		</article>
	)
}
