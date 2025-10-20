import './ProductoCard.css'
import type { Producto } from '../../services/productos'

function money(v?: number | null) {
	if (v == null) return '—'
	return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(v)
}

type Props = { item: Producto; onBuy?: (p: Producto) => void }

export default function ProductoCard({ item, onBuy }: Props) {
	const stock = item.cantidad ?? 0
	const isLow = stock > 0 && stock <= 3

	return (
		<article className="prodcard">
			<div className="prodcard__media">
				{item.foto
					? <img src={item.foto} alt={item.nombre} loading="lazy" />
					: <div className="prodcard__ph">🏄‍♂️</div>}
			</div>

			<div className="prodcard__body">
				<h3 className="prodcard__title">{item.nombre}</h3>

				<div className="prodcard__meta">
					<span className="prodcard__price">{money(item.costo)}</span>
					<span className={`prodcard__stock ${isLow ? 'is-low' : ''}`}>
						{stock > 0 ? `${stock} en stock` : 'Sin stock'}
					</span>
				</div>

				<div className="prodcard__cta">
					<button
						className="btn btn--primary btn--sm"
						type="button"
						onClick={() => onBuy?.(item)}
						disabled={stock <= 0}
						title={stock <= 0 ? 'Sin stock' : 'Añadir a la cesta'}
					>
						{stock <= 0 ? 'Agotado' : 'Comprar'}
					</button>
				</div>
			</div>
		</article>
	)
}
