import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Pack } from '../../services/packs'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import './PackCard.css'

function money(v?: number | null) {
	if (v == null) return '—'
	return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
}

type Props = { pack: Pack }

export default function PackCard({ pack }: Props) {
	const nav = useNavigate()
	const { requireAuth } = useRequireAuth()

	const goToDetail = useCallback(async () => {
		nav(`/packs/${pack.id}`)
	}, [nav, pack.id])

	const onReservar = (e: React.MouseEvent) => {
		e.preventDefault()
		requireAuth(goToDetail)
	}

	return (
		<div className="card">
			<div className="card__media">
				{pack.foto
					? <img src={pack.foto} alt={pack.titulo} loading="lazy" />
					: <div className="card__placeholder">Sin imagen</div>}
			</div>

			<div className="card__body">
				<h3 className="card__title">{pack.titulo}</h3>
				<p className="card__text card__text--multiline">{pack.descripcion ?? '—'}</p>

				<div className="card__meta">
					<span className="price">{money(pack.costo)}</span>
					<button
						className="btn btn--primary btn--sm"
						aria-label={`Reservar ${pack.titulo}`}
						onClick={onReservar}
					>
						Reservar
					</button>
				</div>
			</div>
		</div>
	)
}
