import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './Login.css'
import PedidosList from './components/PedidosList'
import ReservasList from './components/ReservasList'
import ActividadesList from './components/ActividadesList'
import EditProfileModal, { EditProfileValues } from './components/EditProfileModal'

type Perfil = {
	auth_user_id: string
	email?: string | null
	nom_usuario?: string | null
	nombre?: string | null
	apellido?: string | null
	telefono?: string | null
	created_at?: string | null
	updated_at?: string | null
}

export type Pedido = {
	id: number
	fecha_pedido?: string | null
	cantidad?: number | null
	producto?: { id: number; nombre?: string | null } | null
}

export type Reserva = {
	id: number
	fecha_entrada?: string | null
	fecha_salida?: string | null
	personas?: number | null
	alojamiento?: { id: number; nombre?: string | null; foto1?: string | null } | null
}

export type Actividad = {
	id: number
	fecha?: string | null
	cant_pers?: number | null
	pack?: {
		id: number
		titulo?: string | null
		actividad?: { id: number; nombre?: string | null; foto?: string | null } | null
	} | null
	hora?: { id: number; hora_inicio?: string | null; hora_fin?: string | null } | null
}

type Tab = 'pedidos' | 'reservas' | 'actividades'
const TAB_KEY = 'loginp_active_tab'
const asOne = (x: any) => (Array.isArray(x) ? (x[0] ?? null) : x)

function fmtDate(d?: string | null) {
	if (!d) return ''
	try {
		const iso = d.length === 10 ? `${d}T00:00:00` : d
		return new Date(iso).toLocaleDateString('es-ES')
	} catch {
		return ''
	}
}
function rangeDates(a?: string | null, b?: string | null) {
	const A = fmtDate(a); const B = fmtDate(b)
	return A || B ? `${A || '—'} → ${B || '—'}` : ''
}

export default function LoginPage() {
	const [sp] = useSearchParams()
	const nav = useNavigate()

	const [loading, setLoading] = useState(true)
	const [err, setErr] = useState<string | null>(null)

	const [perfil, setPerfil] = useState<Perfil | null>(null)
	const [authEmail, setAuthEmail] = useState<string | null>(null)

	const [pedidos, setPedidos] = useState<Pedido[]>([])
	const [reservas, setReservas] = useState<Reserva[]>([])
	const [actividades, setActividades] = useState<Actividad[]>([])

	const initialTab = (localStorage.getItem(TAB_KEY) as Tab) || 'pedidos'
	const [tab, setTab] = useState<Tab>(initialTab)

	const [modalOpen, setModalOpen] = useState(false)

	const uidParam = sp.get('uid') || ''

	const initials = useMemo(() => {
		const n = `${perfil?.nombre ?? ''} ${perfil?.apellido ?? ''}`.trim()
		const parts = n.split(/\s+/).filter(Boolean)
		if (parts.length === 0) {
			const u = perfil?.nom_usuario?.trim() ?? ''
			return u ? u.slice(0, 2).toUpperCase() : 'US'
		}
		const first = parts[0]?.[0] ?? ''
		const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
		return (first + last).toUpperCase()
	}, [perfil])

	useEffect(() => { localStorage.setItem(TAB_KEY, tab) }, [tab])

	const loadAll = useCallback(async (userId: string, email: string | null) => {
		setErr(null)
		// PERFIL
		const { data: prof, error: profErr } = await supabase
			.from('profiles')
			.select('auth_user_id,email,nom_usuario,nombre,apellido,telefono,created_at,updated_at')
			.eq('auth_user_id', userId)
			.maybeSingle()
		if (profErr) throw profErr
		setPerfil(prof ?? { auth_user_id: userId, email })

		// PEDIDOS
		const pedidosQ = supabase
			.from('pedidos')
			.select(`
        id,
        fecha_pedido,
        cantidad,
        producto:productos!producto_id ( id, nombre )
      `)
			.eq('user_id', userId)
			.order('fecha_pedido', { ascending: false })

		// RESERVAS: traemos id y foto1 del alojamiento para linkear y mostrar portada
		const reservasQ = supabase
			.from('reservas')
			.select(`
        id,
        fecha_entrada,
        fecha_salida,
		personas,
        alojamiento:alojamientos!alojamiento_id ( id, nombre, foto1 )
      `)
			.eq('user_id', userId)
			.order('fecha_entrada', { ascending: false })

		// ACTIVIDADES: traemos foto de la actividad (vía pack.actividad) y la hora seleccionada
		const actividadesQ = supabase
			.from('user_packs')
			.select(`
        id,
        fecha,
        cant_pers,
        pack:packs!pack_id (
          id,
          titulo,
          actividad:actividades ( id, nombre, foto )
        ),
        hora:actividad_horas!hora_id ( id, hora_inicio, hora_fin )
      `)
			.eq('user_id', userId)
			.order('fecha', { ascending: false })
			.order('hora_id', { ascending: true })

		const [pedidosRes, reservasRes, actividadesRes] = await Promise.all([pedidosQ, reservasQ, actividadesQ])
		if (pedidosRes.error) throw pedidosRes.error
		if (reservasRes.error) throw reservasRes.error
		if (actividadesRes.error) throw actividadesRes.error

		setPedidos((pedidosRes.data ?? []).map((row: any) => ({
			id: row.id,
			fecha_pedido: row.fecha_pedido ?? null,
			cantidad: row.cantidad ?? null,
			producto: asOne(row.producto),
		})))

		// mapeo de reservas: añade personas
		setReservas((reservasRes.data ?? []).map((row: any) => ({
			id: row.id,
			fecha_entrada: row.fecha_entrada ?? null,
			fecha_salida: row.fecha_salida ?? null,
			personas: row.personas ?? null,
			alojamiento: row.alojamiento ? {
				id: row.alojamiento.id,
				nombre: row.alojamiento.nombre ?? null,
				foto1: row.alojamiento.foto1 ?? null,
			} : null,
		})))


		setActividades((actividadesRes.data ?? []).map((row: any) => ({
			id: row.id,
			fecha: row.fecha ?? null,
			cant_pers: row.cant_pers ?? null,
			pack: row.pack ? {
				id: row.pack.id,
				titulo: row.pack.titulo ?? null,
				actividad: row.pack.actividad ? {
					id: row.pack.actividad.id,
					nombre: row.pack.actividad.nombre ?? null,
					foto: row.pack.actividad.foto ?? null,
				} : null
			} : null,
			hora: row.hora ? {
				id: row.hora.id,
				hora_inicio: row.hora.hora_inicio ?? null,
				hora_fin: row.hora.hora_fin ?? null,
			} : null,
		})))
	}, [])

	// Montaje
	useEffect(() => {
		let mounted = true
			; (async () => {
				try {
					setLoading(true)
					const { data: { session } } = await supabase.auth.getSession()
					if (!session) { nav('/auth', { replace: true }); return }
					const user = session.user
					if (!mounted) return
					setAuthEmail(user.email ?? null)
					const uid = uidParam || user.id
					await loadAll(uid, user.email ?? null)
				} catch (e: any) {
					if (mounted) setErr(e?.message ?? 'Error cargando los datos')
				} finally {
					if (mounted) setLoading(false)
				}
			})()
		return () => { mounted = false }
	}, [uidParam, nav, loadAll])

	// Cambios de auth
	useEffect(() => {
		const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
			if (event === 'SIGNED_OUT' || !session) {
				nav('/auth', { replace: true })
				return
			}
			const user = session.user
			setAuthEmail(user.email ?? null)
			const uid = uidParam || user.id
			try { await loadAll(uid, user.email ?? null) } catch (e) { setErr((e as any)?.message ?? 'Error actualizando datos') }
		})
		return () => { sub.subscription.unsubscribe() }
	}, [uidParam, nav, loadAll])

	const logout = async () => { await supabase.auth.signOut() }

	const openEdit = () => setModalOpen(true)
	const closeEdit = () => setModalOpen(false)
	const handleSaved = (next: EditProfileValues) => {
		setPerfil((p) => p ? ({ ...p, ...next }) : p)
		setModalOpen(false)
	}

	return (
		<main className="loginp">
			<header className="loginp__hero">
				<div className="container loginp__heroInner">
					<h1 className="loginp__title">Tu cuenta</h1>
					<p className="loginp__sub">Gestiona tu actividad y datos.</p>
				</div>
			</header>

			<section className="container loginp__wrap">
				<div className="loginp__grid">
					{/* IZQUIERDA: Perfil */}
					<article className="loginp-card loginp-card--profile">
						{loading ? (
							<div className="loginp__state">Cargando…</div>
						) : err ? (
							<div className="loginp__state loginp__state--err">Error: {err}</div>
						) : (
							<>
								<div className="loginp__head">
									<div className="loginp__avatar" aria-hidden>
										{(() => {
											const n = `${perfil?.nombre ?? ''} ${perfil?.apellido ?? ''}`.trim()
											const parts = n.split(/\s+/).filter(Boolean)
											if (parts.length === 0) {
												const u = perfil?.nom_usuario?.trim() ?? ''
												return u ? u.slice(0, 2).toUpperCase() : 'US'
											}
											const first = parts[0]?.[0] ?? ''
											const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
											return (first + last).toUpperCase()
										})()}
									</div>
									<div className="loginp__id">
										<div className="loginp__name">
											{perfil?.nombre || perfil?.apellido
												? `${perfil?.nombre ?? ''} ${perfil?.apellido ?? ''}`.trim()
												: perfil?.nom_usuario ?? 'Usuario'}
										</div>
										<div className="loginp__email">{perfil?.email || authEmail || '—'}</div>
									</div>
								</div>

								<div className="loginp__infoGrid">
									<InfoRow label="Usuario" value={perfil?.nom_usuario || '—'} />
									<InfoRow label="Nombre" value={perfil?.nombre || '—'} />
									<InfoRow label="Apellido" value={perfil?.apellido || '—'} />
									<InfoRow label="Teléfono" value={perfil?.telefono || '—'} />
								</div>

								<div className="loginp__ctas">
									<button className="btn btn--ghost" onClick={openEdit}>Editar perfil</button>
									<button className="btn btn--primary" onClick={logout}>Cerrar sesión</button>
								</div>
							</>
						)}
					</article>

					<article className="loginp-card loginp-card--data">
						<div className="loginp-tabs">
							<button className={`loginp-tab ${tab === 'pedidos' ? 'is-active' : ''}`} onClick={() => setTab('pedidos')} type="button">Mis pedidos</button>
							<button className={`loginp-tab ${tab === 'reservas' ? 'is-active' : ''}`} onClick={() => setTab('reservas')} type="button">Mis reservas</button>
							<button className={`loginp-tab ${tab === 'actividades' ? 'is-active' : ''}`} onClick={() => setTab('actividades')} type="button">Mis actividades</button>
						</div>

						<div className="loginp-scroll">
							{tab === 'pedidos' && (<PedidosList items={pedidos} fmtDate={fmtDate} />)}
							{tab === 'reservas' && (<ReservasList items={reservas} fmtDate={fmtDate} rangeDates={rangeDates} />)}
							{tab === 'actividades' && (<ActividadesList items={actividades} fmtDate={fmtDate} />)}

						</div>
					</article>

				</div>
			</section>

			{perfil && (
				<EditProfileModal
					open={modalOpen}
					onClose={closeEdit}
					authUserId={perfil.auth_user_id}
					initial={{
						email: perfil.email ?? null,
						nom_usuario: perfil.nom_usuario ?? null,
						nombre: perfil.nombre ?? null,
						apellido: perfil.apellido ?? null,
						telefono: perfil.telefono ?? null,
					}}
					onSaved={handleSaved}
				/>
			)}
		</main>
	)
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="loginp-row">
			<div className="loginp-row__label">{label}</div>
			<div className="loginp-row__value">{value}</div>
		</div>
	)
}
