import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * Hook para exigir sesión antes de ejecutar una acción.
 * Si no hay sesión, redirige a /auth?next=<ruta-actual>
 */
export function useRequireAuth() {
	const [loading, setLoading] = useState(true)
	const [isAuthed, setIsAuthed] = useState(false)
	const nav = useNavigate()
	const { pathname, search, hash } = useLocation()

	useEffect(() => {
		let mounted = true
			; (async () => {
				const { data: { session } } = await supabase.auth.getSession()
				if (mounted) {
					setIsAuthed(!!session)
					setLoading(false)
				}
			})()
		const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
			setIsAuthed(!!session)
		})
		return () => { sub.subscription.unsubscribe() }
	}, [])

	const requireAuth = useCallback(async <T,>(fn: () => Promise<T> | T): Promise<T | undefined> => {
		const { data: { session } } = await supabase.auth.getSession()
		if (!session) {
			const next = encodeURIComponent(`${pathname}${search}${hash}`)
			nav(`/auth?next=${next}`, { replace: true })
			return
		}
		return await fn()
	}, [nav, pathname, search, hash])

	return { loading, isAuthed, requireAuth }
}
