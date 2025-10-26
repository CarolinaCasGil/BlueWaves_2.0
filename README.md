# BlueWaves — Plataforma web para surfistas (React + TypeScript + Supabase)

**BlueWaves** es una plataforma web para conectar a surfistas con **escuelas**, **alojamientos** y **packs de actividades** en España. Nace como TFG/portfolio con foco en UX sencilla, datos tipados y autenticación segura.

**🌐 Visítala aquí:** https://blue-waves-2-0.vercel.app

## ¿Qué resuelve?
- Centraliza información dispersa (clases, campamentos, alquileres, ofertas).
- Permite comparar **packs** y visualizar qué incluye cada uno (nivel, material, horas, alojamiento).
- Ofrece un **área privada** con perfil, reservas y pedidos históricos para el usuario.

## Funcionalidades principales
- **Catálogo** de Actividades, Alojamiento y Productos, con fichas de detalle.
- **Packs combinados** (actividad + alojamiento) con precio total y plazas.
- **Autenticación** con Supabase (e-mail / magic link). Gestión básica de perfil.
- **Reservas y pedidos** visibles en el área privada.
- **Rutas protegidas** y persistencia de sesión.
- **Storage** para imágenes (portadas, galerías, iconos).

## Arquitectura a alto nivel
- **Frontend:** React 19 + TypeScript + Vite. Router para navegación y layouts.
- **Estado/Fetching:** TanStack Query para caché de datos y estados de carga/errores.
- **Diseño:** Tailwind CSS v4 + componentes propios (cards, modals, grids responsivas).
- **Backend-as-a-Service:** Supabase (PostgreSQL, Auth y Storage). Tipado con generadores de types.
- **Patrón de datos:** Servicios por recurso (`/services`) y hooks de consulta (`/hooks`).

## Estructura (orientativa)
```
src/
├─ components/      # UI reutilizable (Navbar, Cards, Modal, Form, Gallery...)
├─ pages/           # Home, Actividades, Alojamiento, Packs, Login, Perfil
├─ hooks/           # useActivities, usePacks, useAuth...
├─ services/        # acceso a Supabase: activities, packs, bookings, profiles
├─ lib/             # cliente Supabase, utilidades
└─ styles/          # estilos globales
```
> Las tablas clave incluyen: `activities`, `accommodations`, `products`, `packs`, `bookings`, `orders`, `profiles` e imágenes en `storage`.

## Flujo de usuario
1. Explora el catálogo (con filtros básicos y tarjetas responsivas).
2. Abre el **detalle** para ver descripciones, nivel, horarios y galería.
3. En **Packs**, consulta qué incluye y la disponibilidad.
4. **Inicia sesión** para guardar reservas y editar tu perfil.
5. Revisa tus **reservas/pedidos** desde el área privada.

## Decisiones de diseño
- **Mobile-first** con grid fluido y modales accesibles.
- **Datos tipados** end-to-end para minimizar errores.
- **Separación UI/datos**: componentes presentacionales + servicios/hook para IO.
- **Cargas percibidas**: skeletons y estados vacíos definidos.

