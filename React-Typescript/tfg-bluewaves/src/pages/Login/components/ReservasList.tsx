import { Link } from 'react-router-dom'
import type { Reserva } from '../Login'

function isPastRange(fecha_salida?: string | null, fecha_entrada?: string | null) {
	// marcamos como pasado si la salida ya pasó; si no hay salida, usamos entrada
	const base = fecha_salida || fecha_entrada
	if (!base) return false
	const d = new Date(base.length === 10 ? `${base}T00:00:00` : base)
	const today = new Date()
	d.setHours(0, 0, 0, 0)
	today.setHours(0, 0, 0, 0)
	return d.getTime() < today.getTime()
}

export default function ReservasList({
	items,
	fmtDate,
	rangeDates,
}: {
	items: Reserva[]
	fmtDate: (d?: string | null) => string
	rangeDates: (a?: string | null, b?: string | null) => string
}) {
	if (!items || items.length === 0) {
		return <div className="loginp__state">No hay reservas todavía.</div>
	}

	return (
		<div className="loginp-vlist">
			{items.map((r) => {
				const alojId = r.alojamiento?.id
				const title = r.alojamiento?.nombre || `Reserva #${r.id}`
				const cover = r.alojamiento?.foto1 || undefined
				const pasado = isPastRange(r.fecha_salida, r.fecha_entrada)

				const CardInner = (
					<article className="loginp-vcard">
						<div className="loginp-vcard__media">
							{cover ? (
								<img src={cover} alt={title} loading="lazy" />
							) : (
								<div className="loginp-vcard__ph">🏨</div>
							)}
						</div>

						<div className="loginp-vcard__body">
							<h3 className="loginp-vcard__title">{title}</h3>
							<p className="loginp-vcard__text">
								<span className={`loginp-vcard__date ${pasado ? 'is-past' : ''}`}>
									{rangeDates(r.fecha_entrada, r.fecha_salida)}
								</span>
								{typeof r.personas === 'number' && r.personas > 0 ? (
									<> · {r.personas}x👤</>
								) : null}
							</p>
						</div>
					</article>
				)

				return alojId ? (
					<Link
						to={`/alojamientos/${alojId}`}
						key={r.id}
						className="loginp-vcardLink"
						aria-label={`Ver alojamiento ${title}`}
					>
						{CardInner}
					</Link>
				) : (
					<div key={r.id} className="loginp-vcardLink">
						{CardInner}
					</div>
				)
			})}
		</div>
	)
}
