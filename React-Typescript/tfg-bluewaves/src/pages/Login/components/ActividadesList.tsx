type ActividadItem = {
	id: number
	fecha: string | null
	cant_pers?: number | null
	pack?: {
		id: number
		titulo?: string | null
		actividad?: { id: number; nombre?: string | null; foto?: string | null } | null
	} | null
	hora?: { id: number; hora_inicio?: string | null; hora_fin?: string | null } | null
}

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
const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '—')

export default function ActividadesList({
	items,
	fmtDate,
}: {
	items: ActividadItem[]
	fmtDate: (d?: string | null) => string
}) {
	const upcoming = items.filter(a => !isPastDate(a.fecha))
	const past = items.filter(a => isPastDate(a.fecha))
	const ordered = [...upcoming, ...past]

	const Card = ({ a }: { a: ActividadItem }) => {
		const cover = a.pack?.actividad?.foto || undefined
		const titulo = a.pack?.titulo || a.pack?.actividad?.nombre || `Actividad #${a.id}`
		const pastCls = isPastDate(a.fecha) ? 'is-past' : ''
		const horaIni = a.hora?.hora_inicio
		const horaFin = a.hora?.hora_fin
		return (
			<article className="loginp-vcard">
				<div className="loginp-vcard__media">
					{cover ? <img src={cover} alt={titulo} loading="lazy" /> : <div className="loginp-vcard__ph">🏄‍♂️</div>}
				</div>
				<div className="loginp-vcard__body">
					<h3 className="loginp-vcard__title">{titulo}</h3>
					<p className="loginp-vcard__text">
						<span className={`loginp-vcard__date ${pastCls}`}>{fmtDate(a.fecha)}</span>
						{(horaIni || horaFin) && <> · {hhmm(horaIni)}–{hhmm(horaFin)}</>}
						{a.cant_pers ? ` · ${a.cant_pers}x👤` : ''}
					</p>
				</div>
			</article>
		)
	}

	return (
		<div className="loginp-vlist">
			{ordered.length === 0 ? (
				<div className="loginp__state">No hay actividades todavía.</div>
			) : (
				ordered.map(a => <Card key={a.id} a={a} />)
			)}
		</div>
	)
}
