// src/services/profiles.ts
import { list, getById } from '../lib/db'

export type Perfil = {
	auth_user_id: string
	email?: string | null
	nom_usuario?: string | null
	nombre?: string | null
	apellido?: string | null
	telefono?: string | null
	created_at?: string | null
	updated_at?: string | null
}

const SELECT =
	'auth_user_id,email,nom_usuario,nombre,apellido,telefono,created_at,updated_at'

export const PerfilService = {
	all: () => list<Perfil>('profiles', SELECT, { order: { col: 'created_at', asc: false } }),
	byAuthId: (id: string) => getById<Perfil>('profiles', id, SELECT, 'auth_user_id'),
}
