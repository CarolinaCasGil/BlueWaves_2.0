import { useState } from 'react'
import { Link } from 'react-router-dom'
import './Hero.css'

type Props = {
	uniquePlaces: string[]
	onSearch: (payload: { place: string; from: string; to: string }) => void
}

export default function Hero({ uniquePlaces, onSearch }: Props) {
	const [place, setPlace] = useState<string>('')
	const [from, setFrom] = useState<string>('')
	const [to, setTo] = useState<string>('')

	const submit = (e: React.FormEvent) => {
		e.preventDefault()
		onSearch({ place, from, to })
	}

	return (
		<section className="hero hero--fullscreen">
			<div className="hero__bg" />
			<div className="hero__overlay" />
			<div className="container hero__container">
				<div className="hero__grid">
					<div className="hero__left">
						<div className="badges">
							<span className="badge badge--light">★ Destino Top</span>
							<span className="badge badge--blue">-20% Otoño</span>
							<span className="badge badge--green">Cancelación flexible</span>
						</div>

						<h1 className="hero__title hero__title--invert">BlueWaves — Tu próxima experiencia de surf</h1>
						<p className="hero__subtitle hero__subtitle--invert">
							Explora packs y alojamientos verificados, al mejor precio, con atención personalizada para todos los niveles.
						</p>

						<div className="hero__ctas">
							<Link to="/alojamientos" className="btn btn--primary">Ver Alojamientos</Link>
							<Link to="/actividades" className="btn btn--ghost btn--ghost-invert">Ver Actividades</Link>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
