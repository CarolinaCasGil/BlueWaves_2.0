import type { Resena } from '../../services/resenas'
import './ResenaCard.css'

function formatDate(iso?: string | null) {
	if (!iso) return ''
	const d = new Date(iso)
	return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: '2-digit' })
}

function initials(name: string) {
	const parts = name.trim().split(/\s+/)
	const a = parts[0]?.[0] ?? ''
	const b = parts[1]?.[0] ?? ''
	return (a + b).toUpperCase()
}

function Stars({ n = 0 }: { n?: number | null }) {
	const v = Math.max(0, Math.min(5, Number(n || 0)))
	return (
		<span className="bw-rs-stars" aria-label={`Valoración: ${v} de 5`}>
			{'★'.repeat(Math.round(v))}{'☆'.repeat(5 - Math.round(v))}
		</span>
	)
}

export default function ResenaCard({ item }: { item: Resena }) {
	return (
		<article className="bw-rs">
			<div className="bw-rs__avatar" aria-hidden>
				<span>{initials(item.usuario)}</span>
			</div>

			<div className="bw-rs__body">
				<header className="bw-rs__head">
					<div className="bw-rs__user">{item.usuario}</div>
					<div className="bw-rs__meta">
						<Stars n={item.rating} />
						<span className="bw-rs__date">{formatDate(item.created_at || undefined)}</span>
					</div>
				</header>

				<p className="bw-rs__text">{item.comentario}</p>
			</div>
		</article>
	)
}
