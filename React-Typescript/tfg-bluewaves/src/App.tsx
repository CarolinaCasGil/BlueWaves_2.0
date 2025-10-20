import { Suspense, PropsWithChildren, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import type { Session, User } from '@supabase/supabase-js'

import { supabase } from './lib/supabase'

import Navbar from './components/Navbar/Navbar'
import Home from './pages/Home/Home'
import Actividades from './pages/Actividades/Actividades'
import ActividadDetalle from './pages/Actividades/ActividadDetalle'
import Alojamientos from './pages/Alojamiento/Alojamientos'
import AlojamientoDetalle from './pages/Alojamiento/AlojamientoDetalle'
import Productos from './pages/Producto/Producto'
import Auth from './pages/Login/Auth'
import Login from './pages/Login/Login'
import AuthCallback from './pages/Login/AuthCallback'
import PackReserva from './pages/Actividades/PackReserva'

/** Hook de sesión: usa getSession (estable al volver de otra pestaña) */
function useSupabaseSession() {
	const [loading, setLoading] = useState(true)
	const [session, setSession] = useState<Session | null>(null)
	const [user, setUser] = useState<User | null>(null)

	useEffect(() => {
		let mounted = true
			; (async () => {
				const { data: { session } } = await supabase.auth.getSession()
				if (!mounted) return
				setSession(session ?? null)
				setUser(session?.user ?? null)
				setLoading(false)
			})()

		const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
			setSession(newSession ?? null)
			setUser(newSession?.user ?? null)
		})

		return () => {
			mounted = false
			sub.subscription.unsubscribe()
		}
	}, [])

	return { loading, session, user }
}

/** Rutas protegidas: esperan a loading; si no hay user -> /auth */
function ProtectedRoute({ children }: PropsWithChildren) {
	const { loading, user } = useSupabaseSession()
	if (loading) return <div className="container state">Cargando…</div>
	if (!user) return <Navigate to="/auth" replace />
	return <>{children}</>
}

/** Rutas públicas: si hay user -> /login (evita entrar a /auth con sesión) */
function PublicRoute({ children }: PropsWithChildren) {
	const { loading, user } = useSupabaseSession()
	if (loading) return <>{children}</> // no redirigir hasta saber el estado
	if (user) return <Navigate to="/login" replace />
	return <>{children}</>
}

export default function App() {
	return (
		<div className="app">
			<Navbar />

			<Suspense fallback={<div className="container state">Cargando…</div>}>
				<Routes>
					<Route path="/" element={<Home />} />
					<Route path="/actividades" element={<Actividades />} />
					<Route path="/actividades/:id" element={<ActividadDetalle />} />
					<Route path="/packs/:id/reservar" element={<PackReserva />} />
					<Route path="/alojamientos" element={<Alojamientos />} />
					<Route path="/alojamientos/:id" element={<AlojamientoDetalle />} />
					<Route path="/productos" element={<Productos />} />
					<Route
						path="/auth"
						element={
							<PublicRoute>
								<Auth />
							</PublicRoute>
						}
					/>
					<Route
						path="/login"
						element={
							<ProtectedRoute>
								<Login />
							</ProtectedRoute>
						}
					/>
					<Route path="/auth/callback" element={<AuthCallback />} />
					<Route
						path="*"
						element={
							<main className="container" style={{ padding: '24px 0' }}>
								<h1>404</h1>
								<p>Página no encontrada.</p>
							</main>
						}
					/>
				</Routes>
			</Suspense>

			<footer className="app__footer">
				<div className="container">© {new Date().getFullYear()} BlueWaves</div>
			</footer>
		</div>
	)
}
