import { Link } from 'react-router-dom'
import type { Pedido } from '../Login'

export default function PedidosList({
	items,
	fmtDate,
}: {
	items: Pedido[]
	fmtDate: (d?: string | null) => string
}) {
	return (
		<div className="loginp-vlist">
			{items.length === 0 ? (
				<div className="loginp__state">No hay pedidos todavía.</div>
			) : (
				items.map((p) => {
					const prod: any = p.producto ?? {}
					const cover: string | undefined =
						prod.foto || prod.imagen || prod.portada || undefined

					return (
						<Link to={`/pedidos/${p.id}`} key={p.id} className="loginp-vcardLink">
							<article className="loginp-vcard">
								<div className="loginp-vcard__media">
									{cover ? (
										<img src={cover} alt={prod.nombre ?? `Pedido #${p.id}`} loading="lazy" />
									) : (
										<div className="loginp-vcard__ph">📦</div>
									)}
								</div>

								<div className="loginp-vcard__body">
									<h3 className="loginp-vcard__title">
										{prod.nombre ? `${prod.nombre}` : `Pedido #${p.id}`}
									</h3>
									<p className="loginp-vcard__text">
										{fmtDate(p.fecha_pedido)}
										{p.cantidad ? ` · x${p.cantidad}` : ''}
									</p>
								</div>

								<div className="loginp-vcard__footer">
									<span className="loginp-vcard__meta">ID pedido: {p.id}</span>
								</div>
							</article>
						</Link>
					)
				})
			)}
		</div>
	)
}
