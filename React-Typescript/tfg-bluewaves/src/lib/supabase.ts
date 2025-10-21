import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Falla temprano si faltan las env (útil en Vercel)
if (!url || !anon) {
	console.error(
		"[Supabase] Faltan variables de entorno:",
		{ VITE_SUPABASE_URL: !!url, VITE_SUPABASE_ANON_KEY: !!anon }
	);
	throw new Error("Supabase no configurado: revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(url, anon, {
	auth: { persistSession: true, autoRefreshToken: true },
});
