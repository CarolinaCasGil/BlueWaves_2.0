import { Navigate } from 'react-router-dom'
import { PropsWithChildren } from 'react'
import { useSupabaseSession } from '../hooks/useSupabaseSession'

export default function PublicRoute({ children }: PropsWithChildren) {
	const { loading, user } = useSupabaseSession()

	if (loading) {
		// Mientras comprueba sesión, no redirigir
		return <>{children}</>
	}

	if (user) {
		// Si ya hay sesión, esta ruta pública no debe usarse
		return <Navigate to="/login" replace />
	}

	return <>{children}</>
}
