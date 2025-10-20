import { useEffect, useState } from 'react'
import './PayReservationModal.css'

type Props = {
	open: boolean
	onClose: () => void
	onConfirm: () => Promise<void>  // aquí harás la inserción real
	resumen: {
		nombreAloj: string
		from: string | null
		to: string | null
		noches: number
		personas: number          // 👈 NUEVO: cantidad de personas
		totalFmt: string          // pásalo ya formateado
	}
}

export default function PayReservationModal({ open, onClose, onConfirm, resumen }: Props) {
	const [saving, setSaving] = useState(false)
	const [err, setErr] = useState<string | null>(null)
	const [cardName, setCardName] = useState('')
	const [cardNumber, setCardNumber] = useState('')
	const [expiry, setExpiry] = useState('')
	const [cvv, setCvv] = useState('')
	const [accept, setAccept] = useState(false)

	useEffect(() => {
		if (!open) return
		// reset al abrir
		setSaving(false)
		setErr(null)
		setCardName('')
		setCardNumber('')
		setExpiry('')
		setCvv('')
		setAccept(false)

		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [open, onClose])

	if (!open) return null

	const submit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (saving) return
		setErr(null)

		if (!accept) {
			setErr('Debes aceptar los términos y condiciones.')
			return
		}

		try {
			setSaving(true)
			await onConfirm()   // aquí se inserta la reserva en BD
		} catch (e: any) {
			setErr(e?.message ?? 'No se pudo completar el pago')
		} finally {
			setSaving(false)
		}
	}

	const stop = (e: React.MouseEvent) => e.stopPropagation()

	return (
		<div className="paymod" role="dialog" aria-modal="true" onClick={onClose}>
			<div className="paymod__backdrop" />
			<div className="paymod__card" onClick={stop}>
				<header className="paymod__header">
					<h2>Confirmar reserva</h2>
					<button className="paymod__close" onClick={onClose} aria-label="Cerrar">×</button>
				</header>

				<form className="paymod__body" onSubmit={submit}>
					<section className="paymod__summary">
						<div className="paymod__row"><span>Alojamiento</span><strong>{resumen.nombreAloj}</strong></div>
						<div className="paymod__row"><span>Entrada</span><strong>{resumen.from ?? '—'}</strong></div>
						<div className="paymod__row"><span>Salida</span><strong>{resumen.to ?? '—'}</strong></div>
						<div className="paymod__row"><span>Noches</span><strong>{resumen.noches || '—'}</strong></div>
						<div className="paymod__row"><span>Personas</span><strong>{resumen.personas}</strong></div> {/* 👈 NUEVO */}
						<div className="paymod__row"><span>Total</span><strong className="paymod__total">{resumen.totalFmt}</strong></div>
					</section>

					<section className="paymod__form">
						<div className="grid">
							<label className="auth__label">
								Titular de la tarjeta
								<input type="text" placeholder="Nombre del titular" value={cardName} onChange={(e) => setCardName(e.target.value)} />
							</label>
							<label className="auth__label">
								Nº de tarjeta
								<input inputMode="numeric" placeholder="1234 5678 9012 3456" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
							</label>
							<label className="auth__label">
								Caducidad
								<input placeholder="MM/AA" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
							</label>
							<label className="auth__label">
								CVV
								<input inputMode="numeric" placeholder="123" value={cvv} onChange={(e) => setCvv(e.target.value)} />
							</label>
							<label className="auth__check">
								<input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
								<span>Acepto los términos y condiciones (pago simulado)</span>
							</label>
						</div>
					</section>

					{err && <div className="auth__msg auth__msg--err">{err}</div>}

					<footer className="paymod__footer">
						<button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
						<button type="submit" className="btn btn--primary" disabled={saving}>
							{saving ? 'Procesando…' : 'Pagar y reservar'}
						</button>
					</footer>
				</form>
			</div>
		</div>
	)
}
