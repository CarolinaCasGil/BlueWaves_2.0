import { Navigate } from 'react-router-dom'
import { PropsWithChildren } from 'react'
import { useSupabaseSession } from '../hooks/useSupabaseSession'

export default function ProtectedRoute({ children }: PropsWithChildren) {
	const { loading, user } = useSupabaseSession()

	if (loading) {
		return <div style={{ padding: 16 }}>Cargando…</div>
	}

	if (!user) {
		return <Navigate to="/auth" replace />
	}

	return <>{children}</>
}
