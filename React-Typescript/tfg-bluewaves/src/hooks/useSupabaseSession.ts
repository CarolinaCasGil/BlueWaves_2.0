import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

export function useSupabaseSession() {
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
