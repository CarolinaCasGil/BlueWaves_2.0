import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import './EditProfileModal.css'

export type EditProfileValues = {
	email: string | null
	nom_usuario: string | null
	nombre: string | null
	apellido: string | null
	telefono: string | null
}

type Props = {
	open: boolean
	onClose: () => void
	authUserId: string
	initial: EditProfileValues
	onSaved: (next: EditProfileValues) => void
}

function isValidEmail(v: string) {
	return !!v && v.includes('@') && v.includes('.')
}

export default function EditProfileModal({ open, onClose, authUserId, initial, onSaved }: Props) {
	const [email, setEmail] = useState(initial.email ?? '')
	const [nomUsuario, setNomUsuario] = useState(initial.nom_usuario ?? '')
	const [nombre, setNombre] = useState(initial.nombre ?? '')
	const [apellido, setApellido] = useState(initial.apellido ?? '')
	const [telefono, setTelefono] = useState(initial.telefono ?? '')
	const [saving, setSaving] = useState(false)
	const [err, setErr] = useState<string | null>(null)

	const emailChanged = useMemo(() => (initial.email ?? '') !== (email ?? ''), [initial.email, email])

	// Resetear estado al abrir
	useEffect(() => {
		if (!open) return
		setEmail(initial.email ?? '')
		setNomUsuario(initial.nom_usuario ?? '')
		setNombre(initial.nombre ?? '')
		setApellido(initial.apellido ?? '')
		setTelefono(initial.telefono ?? '')
		setErr(null)
		setSaving(false)
	}, [open, initial])

	// Cerrar con ESC
	useEffect(() => {
		if (!open) return
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [open, onClose])

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (saving) return
		setErr(null)

		const cleanEmail = (email ?? '').trim()
		if (cleanEmail && !isValidEmail(cleanEmail)) {
			setErr('Introduce un email válido.')
			return
		}

		setSaving(true)
		try {
			// 1) Actualiza profiles
			const payload = {
				email: cleanEmail || null,
				nom_usuario: (nomUsuario ?? '').trim() || null,
				nombre: (nombre ?? '').trim() || null,
				apellido: (apellido ?? '').trim() || null,
				telefono: (telefono ?? '').trim() || null,
			}

			const { data: updated, error: upErr } = await supabase
				.from('profiles')
				.update(payload)
				.eq('auth_user_id', authUserId)
				.select('email, nom_usuario, nombre, apellido, telefono')
				.maybeSingle()

			if (upErr) {
				if (String(upErr.message).includes('profiles_email_key')) throw new Error('Ese email ya está en uso.')
				if (String(upErr.message).toLowerCase().includes('nom_usuario')) throw new Error('Ese nombre de usuario ya existe.')
				throw upErr
			}

			const nextVals: EditProfileValues = {
				email: updated?.email ?? payload.email,
				nom_usuario: updated?.nom_usuario ?? payload.nom_usuario,
				nombre: updated?.nombre ?? payload.nombre,
				apellido: updated?.apellido ?? payload.apellido,
				telefono: updated?.telefono ?? payload.telefono,
			}

			// 2) Sincroniza email con Auth si cambió
			if (emailChanged && cleanEmail) {
				// No bloqueamos el cierre del modal por este flujo; si falla, solo lo registramos
				await supabase.auth.updateUser({ email: cleanEmail }).catch(() => { })
			}

			onSaved(nextVals)
			// ✅ Cerrar automáticamente al guardar
			onClose()
		} catch (e: any) {
			setErr(e?.message ?? 'Error guardando cambios')
		} finally {
			setSaving(false)
		}
	}

	if (!open) return null

	const stop = (e: React.MouseEvent) => e.stopPropagation()

	return (
		<div className="bw-modal" role="dialog" aria-modal="true" aria-labelledby="editProfileTitle" onClick={onClose}>
			<div className="bw-modal__backdrop" />
			<div className="bw-modal__card" onClick={stop}>
				<header className="bw-modal__header">
					<h2 id="editProfileTitle">Editar perfil</h2>
					<button className="bw-modal__close" onClick={onClose} aria-label="Cerrar">×</button>
				</header>

				<form className="bw-modal__body" onSubmit={onSubmit}>
					<div className="bw-formgrid">
						<label className="auth__label">
							Email
							<input
								type="email"
								value={email ?? ''}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="tu@correo.com"
							/>
						</label>

						<label className="auth__label">
							Usuario (alias)
							<input
								type="text"
								value={nomUsuario ?? ''}
								onChange={(e) => setNomUsuario(e.target.value)}
								placeholder="tu-usuario"
							/>
						</label>

						<label className="auth__label">
							Nombre
							<input
								type="text"
								value={nombre ?? ''}
								onChange={(e) => setNombre(e.target.value)}
								placeholder="Tu nombre"
							/>
						</label>

						<label className="auth__label">
							Apellido
							<input
								type="text"
								value={apellido ?? ''}
								onChange={(e) => setApellido(e.target.value)}
								placeholder="Tu apellido"
							/>
						</label>

						<label className="auth__label">
							Teléfono
							<input
								type="tel"
								inputMode="tel"
								value={telefono ?? ''}
								onChange={(e) => setTelefono(e.target.value)}
								placeholder="+34 600 000 000"
							/>
						</label>
					</div>

					{err && <div className="auth__msg auth__msg--err">{err}</div>}

					<footer className="bw-modal__footer">
						<button type="button" className="btn btn--ghost" onClick={onClose}>Cancelar</button>
						<button type="submit" className="btn btn--primary" disabled={saving}>
							{saving ? 'Guardando…' : 'Guardar cambios'}
						</button>
					</footer>
				</form>
			</div>
		</div>
	)
}
