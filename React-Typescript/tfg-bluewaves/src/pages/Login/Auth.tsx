// src/pages/Auth/Auth.tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './Auth.css'

type Mode = 'login' | 'register'
const PENDING_PROFILE_KEY = 'bw_profile_pending'

export default function Auth() {
	const [mode, setMode] = useState<Mode>('login')

	// Login
	const [identifier, setIdentifier] = useState('')
	const [password, setPassword] = useState('')
	const [password2, setPassword2] = useState('')

	// Registro
	const [nomUsuario, setNomUsuario] = useState('')
	const [nombre, setNombre] = useState('')
	const [apellido, setApellido] = useState('')
	const [telefono, setTelefono] = useState('')
	const [email, setEmail] = useState('')

	const [loading, setLoading] = useState(false)
	const [msg, setMsg] = useState<string | null>(null)
	const [err, setErr] = useState<string | null>(null)
	const navigate = useNavigate()

	// Aseguramos que la página pueda hacer scroll (fix móviles)
	useEffect(() => {
		document.body.classList.remove('no-scroll')
		return () => { }
	}, [])

	// limpiar mensajes al cambiar de pestaña
	useEffect(() => {
		setMsg(null)
		setErr(null)
	}, [mode])

	const looksLikeEmail = (s: string) => s.includes('@')

	// Permitir login con email o alias (nom_usuario)
	async function resolveEmailForLogin(idOrUser: string): Promise<string> {
		const id = idOrUser.trim()
		if (looksLikeEmail(id)) return id
		const { data, error } = await supabase
			.from('profiles')
			.select('email')
			.ilike('nom_usuario', id)
			.limit(1)
			.single()
		if (error || !data?.email) throw new Error('Usuario no encontrado. Prueba con tu email.')
		return data.email
	}

	// Guardar/actualizar perfil en profiles (clave: auth_user_id)
	async function upsertOwnProfile(overrides?: Partial<{
		email: string | null
		nom_usuario: string | null
		nombre: string | null
		apellido: string | null
		telefono: string | null
	}>) {
		const { data: ures, error: uerr } = await supabase.auth.getUser()
		if (uerr || !ures?.user) throw new Error('No hay sesión activa.')

		const payload = {
			auth_user_id: ures.user.id,
			email: (overrides?.email ?? ures.user.email ?? '').trim() || null,
			nom_usuario: overrides?.nom_usuario ?? null,
			nombre: overrides?.nombre ?? null,
			apellido: overrides?.apellido ?? null,
			telefono: overrides?.telefono ?? null,
		}

		const { error } = await supabase
			.from('profiles')
			.upsert(payload, { onConflict: 'auth_user_id' })
			.select('auth_user_id')
			.single()

		if (error) throw error
	}

	// Si hay perfil pendiente en localStorage, lo volcamos al crear sesión
	useEffect(() => {
		(async () => {
			const { data: { session } } = await supabase.auth.getSession()
			if (!session) return
			const raw = localStorage.getItem(PENDING_PROFILE_KEY)
			if (!raw) return
			try {
				const p = JSON.parse(raw)
				await upsertOwnProfile({
					email: (p.email ?? '').trim() || null,
					nom_usuario: p.nom_usuario ?? null,
					nombre: p.nombre ?? null,
					apellido: p.apellido ?? null,
					telefono: p.telefono ?? null,
				})
			} catch { } finally {
				localStorage.removeItem(PENDING_PROFILE_KEY)
			}
		})()
	}, [])

	// (Opcional) Comprobar unicidad antes de registrar
	async function assertUniqueEmailAndUser(emailV: string, userV: string) {
		const [byEmail, byUser] = await Promise.all([
			supabase.from('profiles').select('email').eq('email', emailV.trim()).maybeSingle(),
			userV.trim()
				? supabase.from('profiles').select('nom_usuario').ilike('nom_usuario', userV.trim()).maybeSingle()
				: Promise.resolve({ data: null, error: null } as const),
		])
		if (byEmail.data) throw new Error('Ese email ya está registrado.')
		if (byUser.data) throw new Error('Ese nombre de usuario ya existe.')
	}

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		setMsg(null); setErr(null); setLoading(true)
		try {
			if (mode === 'login') {
				if (!identifier.trim() || !password) throw new Error('Introduce tu email/usuario y contraseña.')
				const loginEmail = await resolveEmailForLogin(identifier)
				const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
				if (error) throw error

				// Volcar perfil pendiente si hubiera
				const raw = localStorage.getItem(PENDING_PROFILE_KEY)
				if (raw) {
					try {
						const p = JSON.parse(raw)
						await upsertOwnProfile({
							email: (p.email ?? '').trim() || null,
							nom_usuario: p.nom_usuario ?? null,
							nombre: p.nombre ?? null,
							apellido: p.apellido ?? null,
							telefono: p.telefono ?? null,
						})
					} catch { }
					localStorage.removeItem(PENDING_PROFILE_KEY)
				}

				const { data: { user } } = await supabase.auth.getUser()
				if (user) navigate(`/login?uid=${user.id}`, { replace: true })
				return
			}

			// ===== Registro =====
			if (!email.includes('@')) throw new Error('Introduce un email válido (debe incluir @).')
			if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.')
			if (password !== password2) throw new Error('Las contraseñas no coinciden.')
			await assertUniqueEmailAndUser(email, nomUsuario)

			// IMPORTANTE: quitamos emailRedirectTo para aislar errores 500 por redirects/SMTP.
			let signUpError: any = null
			let signUpData: any = null
			try {
				const { data, error } = await supabase.auth.signUp({
					email: email.trim(),
					password,
					options: {
						// Si ya tengas SMTP/redirects bien, vuelve a activar esta línea:
						// emailRedirectTo: `${window.location.origin}/auth/callback`,
						data: {
							nom_usuario: nomUsuario.trim() || null,
							nombre: nombre.trim() || null,
							apellido: apellido.trim() || null,
							telefono: telefono.trim() || null,
						},
					},
				})
				signUpData = data
				signUpError = error
			} catch (e) {
				console.error('SIGNUP network/catch error:', e)
				throw e
			}

			if (signUpError) {
				console.error('SIGNUP error object:', signUpError)
				throw new Error(signUpError.message || 'Fallo en registro')
			}

			console.log('SIGNUP data:', signUpData)

			const hasSession = !!signUpData?.session
			if (hasSession) {
				await upsertOwnProfile({
					email: email.trim(),
					nom_usuario: nomUsuario.trim() || null,
					nombre: nombre.trim() || null,
					apellido: apellido.trim() || null,
					telefono: telefono.trim() || null,
				})
				const { data: { user } } = await supabase.auth.getUser()
				if (user) navigate(`/login?uid=${user.id}`, { replace: true })
			} else {
				// flujo de confirmación por email
				localStorage.setItem(PENDING_PROFILE_KEY, JSON.stringify({
					email: email.trim(),
					nom_usuario: nomUsuario.trim() || null,
					nombre: nombre.trim() || null,
					apellido: apellido.trim() || null,
					telefono: telefono.trim() || null,
				}))
				setMsg('¡Cuenta creada! Revisa tu correo para confirmar. Guardaremos tu perfil al iniciar sesión.')
			}
		} catch (e: any) {
			console.error('SIGNUP catch:', e)
			setErr(e?.message ?? 'Ocurrió un error')
		} finally {
			setLoading(false)
		}
	}

	return (
		<main className="auth auth--compact auth--register">
			<section className="container auth__wrap">
				<form className="auth__card" onSubmit={onSubmit}>
					<h1 className="auth__title">{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>

					<div className="auth__tabs" role="tablist" aria-label="Modo de acceso">
						<button
							type="button"
							role="tab"
							className={mode === 'login' ? 'is-active' : ''}
							onClick={() => setMode('login')}
						>
							Iniciar sesión
						</button>
						<button
							type="button"
							role="tab"
							className={mode === 'register' ? 'is-active' : ''}
							onClick={() => setMode('register')}
						>
							Registrarse
						</button>
					</div>

					{mode === 'login' ? (
						<>
							<label className="auth__label">
								Email o usuario
								<input
									type="text"
									autoComplete="username"
									value={identifier}
									onChange={(e) => setIdentifier(e.target.value)}
									placeholder="tu@correo.com o tu-usuario"
								/>
							</label>
							<label className="auth__label">
								Contraseña
								<input
									type="password"
									required
									minLength={6}
									autoComplete="current-password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="••••••••"
								/>
							</label>
						</>
					) : (
						<>
							<div className="auth__grid">
								<label className="auth__label">
									Nombre
									<input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />
								</label>
								<label className="auth__label">
									Apellido
									<input type="text" value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Tu apellido" />
								</label>
								<label className="auth__label">
									Usuario (alias)
									<input type="text" value={nomUsuario} onChange={(e) => setNomUsuario(e.target.value)} placeholder="p. ej. surflover" />
								</label>
								<label className="auth__label">
									Teléfono
									<input type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+34 600 000 000" />
								</label>
							</div>

							<label className="auth__label">
								Email
								<input
									type="email"
									autoComplete="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="tu@correo.com"
								/>
							</label>

							<div className="auth__grid auth__grid--cols2 auth__pwrow">
								<label className="auth__label">
									Contraseña
									<input
										type="password"
										minLength={6}
										autoComplete="new-password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										placeholder="••••••••"
									/>
								</label>
								<label className="auth__label">
									Repite la contraseña
									<input
										type="password"
										minLength={6}
										value={password2}
										onChange={(e) => setPassword2(e.target.value)}
										placeholder="••••••••"
									/>
								</label>
							</div>
						</>
					)}

					{msg && <div className="auth__msg auth__msg--ok">{msg}</div>}
					{err && <div className="auth__msg auth__msg--err">{err}</div>}

					<div className="auth__ctas">
						<button className="btn btn--primary" type="submit" disabled={loading}>
							{loading ? 'Procesando…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
						</button>
						<Link to="/" className="btn btn--ghost">Cancelar</Link>
					</div>
				</form>
			</section>
		</main>
	)
}
