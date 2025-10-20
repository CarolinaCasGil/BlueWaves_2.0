import { useEffect, useRef, useState } from 'react'
import './Carrousel.css'

type Props = {
	images: string[]
	altBase: string
	height?: number
	auto?: boolean
	intervalMs?: number
}

export default function Carousel({ images, altBase, height = 200, auto = true, intervalMs = 3500 }: Props) {
	const [index, setIndex] = useState(0)
	const count = images.length
	const trackRef = useRef<HTMLDivElement | null>(null)
	const timerRef = useRef<number | null>(null)
	const hoverRef = useRef(false)

	useEffect(() => {
		if (!auto || count <= 1) return
		const tick = () => { if (!hoverRef.current) setIndex((i) => (i + 1) % count) }
		timerRef.current = window.setInterval(tick, intervalMs)
		return () => { if (timerRef.current) window.clearInterval(timerRef.current) }
	}, [auto, count, intervalMs])

	const go = (next: number) => {
		if (count <= 1) return
		setIndex((next + count) % count)
	}

	// swipe táctil
	useEffect(() => {
		const el = trackRef.current
		if (!el || count <= 1) return
		let startX = 0, dx = 0, touching = false
		const onTouchStart = (e: TouchEvent) => { touching = true; startX = e.touches[0].clientX; dx = 0 }
		const onTouchMove = (e: TouchEvent) => { if (!touching) return; dx = e.touches[0].clientX - startX }
		const onTouchEnd = () => {
			touching = false
			const threshold = 40
			if (dx > threshold) go(index - 1)
			else if (dx < -threshold) go(index + 1)
			dx = 0
		}
		el.addEventListener('touchstart', onTouchStart, { passive: true })
		el.addEventListener('touchmove', onTouchMove, { passive: true })
		el.addEventListener('touchend', onTouchEnd)
		return () => {
			el.removeEventListener('touchstart', onTouchStart)
			el.removeEventListener('touchmove', onTouchMove)
			el.removeEventListener('touchend', onTouchEnd)
		}
	}, [index, count])

	return (
		<div
			className="carousel"
			style={{ height }}
			onMouseEnter={() => (hoverRef.current = true)}
			onMouseLeave={() => (hoverRef.current = false)}
		>
			<div className="carousel__viewport">
				<div
					className="carousel__track"
					ref={trackRef}
					style={{ width: `${100 * count}%`, transform: `translateX(-${(100 / count) * index}%)` }}
				>
					{images.map((src, i) => (
						<div className="carousel__slide" key={i} style={{ width: `${100 / count}%` }}>
							<img src={src} alt={`${altBase} ${i + 1}`} loading="lazy" />
						</div>
					))}
				</div>
			</div>

			{count > 1 && (
				<>
					<button
						className="carousel__arrow carousel__arrow--left"
						aria-label="Anterior"
						onClick={(e) => { e.stopPropagation(); e.preventDefault(); go(index - 1) }}
					>
						‹
					</button>
					<button
						className="carousel__arrow carousel__arrow--right"
						aria-label="Siguiente"
						onClick={(e) => { e.stopPropagation(); e.preventDefault(); go(index + 1) }}
					>
						›
					</button>
				</>
			)}
		</div>
	)
}
