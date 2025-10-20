import { useEffect, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './Navbar.css'

export default function Navbar() {
	const [open, setOpen] = useState(false)
	const [isAuthed, setIsAuthed] = useState<boolean>(false)

	const close = () => setOpen(false)

	useEffect(() => {
		let mounted = true

			; (async () => {
				const { data: { session } } = await supabase.auth.getSession()
				if (!mounted) return
				setIsAuthed(!!session)
			})()

		const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
			setIsAuthed(!!session)
		})

		return () => {
			mounted = false
			sub.subscription.unsubscribe()
		}
	}, [])

	return (
		<nav className="navbar">
			<div className="container navbar__inner">
				<Link to="/" className="brand" onClick={close}>
					BlueWaves
				</Link>

				<button
					className={`hamburger ${open ? 'is-open' : ''}`}
					aria-label="Abrir menú"
					aria-expanded={open}
					onClick={() => setOpen(v => !v)}
				>
					<span />
					<span />
					<span />
				</button>

				<div className={`nav-menu ${open ? 'is-open' : ''}`}>
					<NavLink to="/" end className="nav-link" onClick={close}>
						Inicio
					</NavLink>
					<NavLink to="/actividades" className="nav-link" onClick={close}>
						Actividades
					</NavLink>
					<NavLink to="/alojamientos" className="nav-link" onClick={close}>
						Alojamientos
					</NavLink>
					{/* <NavLink to="/productos" className="nav-link" onClick={close}>
						Productos
					</NavLink> */}

					<Link
						to={isAuthed ? '/login' : '/auth'}
						className="bw-nav__iconbtn"
						aria-label={isAuthed ? 'Mi cuenta' : 'Iniciar sesión'}
						onClick={close}
					>
						<svg className="bw-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
							<path
								d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Z"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.8"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
							<path
								d="M4 20a8 8 0 0 1 16 0"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.8"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</Link>
				</div>
			</div>
		</nav>
	)
}
