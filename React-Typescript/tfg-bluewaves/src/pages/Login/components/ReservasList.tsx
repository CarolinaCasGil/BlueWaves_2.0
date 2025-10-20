import { Link } from 'react-router-dom'
import type { Reserva } from '../Login'

function toISO(d?: string | null) {
	if (!d) return null
	return d.length === 10 ? `${d}T00:00:00` : d
}
function isPastDate(iso?: string | null) {
	if (!iso) return false
	const x = new Date(toISO(iso)!)
	const today = new Date()
	x.setHours(0, 0, 0, 0); today.setHours(0, 0, 0, 0)
	return x.getTime() < today.getTime()
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
	const isPastReserva = (r: Reserva) => isPastDate(r.fecha_salida ?? r.fecha_entrada)

	// 1) separo, 2) concateno: próximas primero, pasadas al final
	const upcoming = items.filter(r => !isPastReserva(r))
	const past = items.filter(r => isPastReserva(r))
	const ordered = [...upcoming, ...past]

	const Card = ({ r }: { r: Reserva }) => {
		const cover = r.alojamiento?.foto1 || undefined
		const alojId = r.alojamiento?.id
		const href = alojId ? `/alojamientos/${alojId}` : '#'
		const pastCls = isPastReserva(r) ? 'is-past' : ''
		return (
			<Link to={href} className="loginp-vcardLink">
				<article className="loginp-vcard">
					<div className="loginp-vcard__media">
						{cover ? <img src={cover} alt={r.alojamiento?.nombre ?? `Reserva #${r.id}`} loading="lazy" /> : <div className="loginp-vcard__ph">🏨</div>}
					</div>
					<div className="loginp-vcard__body">
						<h3 className="loginp-vcard__title">{r.alojamiento?.nombre || `Reserva #${r.id}`}</h3>
						<p className="loginp-vcard__text">
							<span className={`loginp-vcard__date ${pastCls}`}>{rangeDates(r.fecha_entrada, r.fecha_salida)}</span>
							{typeof r.personas === 'number' && r.personas > 0 && <> · {r.personas}x👤</>}
						</p>
					</div>
				</article>
			</Link>
		)
	}

	return (
		<div className="loginp-vlist">
			{ordered.length === 0 ? (
				<div className="loginp__state">No hay reservas todavía.</div>
			) : (
				ordered.map(r => <Card key={r.id} r={r} />)
			)}
		</div>
	)
}
