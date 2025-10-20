import { Link } from 'react-router-dom'
import type { Alojamiento } from '../../services/alojamientos'
import Carousel from '../Carrousel/Carousel'
import './AlojamientoCard.css'

function money(v?: number | null) {
	if (v == null) return '—'
	return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
}

type Props = {
	item: Alojamiento
	auto?: boolean  // ← NUEVO: controla autoplay del carrusel
}

export default function AlojamientoCard({ item, auto = true }: Props) {
	const photos = [item.foto1, item.foto2, item.foto3, item.foto4].filter(Boolean) as string[]
	const hasImages = photos.length > 0
	const lugar = (item as any).lugar || (item as any).direccion || ''

	return (
		<div className="bw-alojcard">
			<div className="bw-alojcard__media">
				<div className="bw-alojcard__mediaInner">
					{hasImages ? (
						<Carousel
							images={photos.slice(0, 4)}
							altBase={item.nombre}
							auto={auto}
							intervalMs={3500}
						/>
					) : (
						<div className="bw-alojcard__placeholder">Sin imagen</div>
					)}
				</div>
			</div>

			<div className="bw-alojcard__body">
				<h3 className="bw-alojcard__title">{item.nombre}</h3>
				{lugar ? <div className="bw-alojcard__place">{lugar}</div> : null}
				<p className="bw-alojcard__text">{item.descripcion ?? '—'}</p>

				<div className="bw-alojcard__meta">
					<span className="bw-alojcard__price">{money(item.costo)}</span>
					<Link to={`/alojamientos/${item.id}`} className="btn btn--link btn--sm">
						Más información →
					</Link>
				</div>
			</div>
		</div>
	)
}
