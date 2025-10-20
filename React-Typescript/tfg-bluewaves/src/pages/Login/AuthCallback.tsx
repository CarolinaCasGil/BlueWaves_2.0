// src/pages/AuthCallback/AuthCallback.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AuthCallback() {
	const navigate = useNavigate()
	const [msg, setMsg] = useState('Completando acceso…')
	const [err, setErr] = useState<string | null>(null)

	useEffect(() => {
		(async () => {
			try {
				// 1) Completar sesión según los parámetros recibidos
				const url = new URL(window.location.href)
				const code = url.searchParams.get('code')
				if (code) {
					const { error } = await supabase.auth.exchangeCodeForSession(code)
					if (error) throw error
				} else if (window.location.hash) {
					const hash = new URLSearchParams(window.location.hash.slice(1))
					const access_token = hash.get('access_token')
					const refresh_token = hash.get('refresh_token')
					if (access_token && refresh_token) {
						const { error } = await supabase.auth.setSession({ access_token, refresh_token })
						if (error) throw error
					}
				}

				// 2) Upsert de perfil con los campos del registro (si existen)
				const { data: ures, error: uerr } = await supabase.auth.getUser()
				if (uerr) throw uerr
				const user = ures?.user
				if (!user) throw new Error('No hay sesión activa.')

				const raw = localStorage.getItem('pendingProfile')
				if (raw) {
					const p = JSON.parse(raw)
					// upsert propio (RLS: auth.uid() = auth_user_id)
					const { error } = await supabase.from('profiles').upsert({
						auth_user_id: user.id,
						email: user.email ?? p.email ?? null,
						nom_usuario: p.nom_usuario ?? null,
						nombre: p.nombre ?? null,
						apellido: p.apellido ?? null,
						telefono: p.telefono ?? null,
					}, { onConflict: 'auth_user_id' }).select('auth_user_id')
					if (error) throw error
					localStorage.removeItem('pendingProfile')
				} else {
					// Si no había pendingProfile, asegúrate al menos de que existe la fila
					await supabase.from('profiles').upsert({
						auth_user_id: user.id,
						email: user.email ?? null,
					}, { onConflict: 'auth_user_id' }).select('auth_user_id')
				}

				setMsg('Acceso completado. Redirigiendo…')
				navigate('/login', { replace: true })
			} catch (e: any) {
				setErr(e?.message ?? 'Error completando el acceso.')
			}
		})()
	}, [navigate])

	return (
		<main style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
			<div style={{
				padding: '16px 20px',
				border: '1px solid #e5e7eb',
				borderRadius: 12,
				boxShadow: '0 6px 24px rgba(2,6,23,.06)',
				maxWidth: 480,
				textAlign: 'center'
			}}>
				<h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900 }}>Autenticación</h1>
				{err ? <p style={{ margin: 0, color: '#9f1239' }}>{err}</p> : <p style={{ margin: 0 }}>{msg}</p>}
			</div>
		</main>
	)
}
