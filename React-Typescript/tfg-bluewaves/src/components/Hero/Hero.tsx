import { Link } from 'react-router-dom'
import './Hero.css'

export default function Hero() {
	return (
		<section className="home-hero home-hero--fullscreen">
			<div className="home-hero__bg" />
			<div className="home-hero__overlay" />
			<div className="container home-hero__container">
				<div className="home-hero__grid">
					<div className="home-hero__left">
						{/* Chips siempre en horizontal (scroll en móvil si hace falta) */}
						<div className="home-badges home-badges--nowrap" aria-label="destacados">
							<span className="home-badge home-badge--light">★ Destino Top</span>
							<span className="home-badge home-badge--blue">-20% Otoño</span>
							<span className="home-badge home-badge--green">Cancelación flexible</span>
						</div>

						{/* Marca + subtítulo */}
						<div className="home-heroBrand">
							<h1 className="home-heroTitle">BlueWaves</h1>
							<p className="home-heroSubtitle">Tu próxima experiencia de surf</p>
						</div>

						<p className="home-heroLead">
							Explora packs y alojamientos verificados, al mejor precio, con atención personalizada para todos los niveles.
						</p>

						{/* CTAs (se apoyan en tu .btn global, con tweaks solo aquí) */}
						<div className="home-hero__ctas">
							<Link to="/alojamientos" className="btn btn--primary">Ver Alojamientos</Link>
							<Link to="/actividades" className="btn btn--ghost btn--ghost-invert">Ver Actividades</Link>
						</div>
					</div>
					{/* Si algún día quieres poner contenido en la derecha, deja este grid a 2 col. */}
				</div>
			</div>
		</section>
	)
}
