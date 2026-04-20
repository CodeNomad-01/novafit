# NovaFit

App de seguimiento de rutinas al estilo *Solo Leveling*: crea misiones
(rutinas), inicia combates (sesiones) con cronómetro, edita series al vuelo y
compara poder semanal con tus aliados.

Stack: Next.js 15 (Pages Router) · React 19 · TypeScript · Tailwind · Supabase
(Postgres + Auth + RLS) · Chart.js. Desplegable gratis en Vercel.

## Estructura del repo

```
.
├── components/          Componentes de UI reutilizables
├── lib/
│   ├── auth/            Contexto y tipos de autenticación (Supabase Auth)
│   ├── supabase/        Cliente Supabase y tipos de la DB
│   ├── store/           Estado global (rutinas, sesiones, amigos)
│   └── domain/          Tipos y lógica de dominio (rank, stats, greeting, id)
├── pages/               Rutas (Pages Router de Next.js)
├── public/              Assets estáticos (incluye novafit-logo.png)
├── styles/              CSS global
└── supabase/
    └── schema.sql       Esquema completo de Postgres (tablas, RLS, RPCs, triggers)
```

## 1. Desarrollo local

```bash
npm install
cp .env.example .env.local    # y rellena los valores de Supabase
npm run dev
```

Abre http://localhost:3000.

## 2. Configurar Supabase (10 min)

1. Crea un proyecto en <https://supabase.com> (región EU, guarda la contraseña
   del Postgres por si acaso).
2. En **Authentication → Providers** activa **Email**. Para pruebas rápidas
   desactiva "Confirm email"; actívalo antes de compartirla con tus amigos.
3. En **SQL Editor → New Query** pega el contenido de
   [`supabase/schema.sql`](supabase/schema.sql) y pulsa `Run`.
   Crea tablas, RLS, un trigger que genera el `profiles` automáticamente al
   registrarse, y dos funciones (`weekly_stats`, `daily_volume`) para la
   comparativa.
4. En **Project Settings → API** copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   y pégalos en `.env.local`.

## 3. Desplegar en Vercel (5 min)

1. Sube el repo a GitHub.
2. En <https://vercel.com> → **Add New → Project** → conecta el repo.
   Vercel detectará Next.js automáticamente (no hace falta tocar el Root Directory).
3. En **Environment Variables** añade `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy. Tendrás `https://tu-app.vercel.app` en ~60 segundos.
5. Vuelve a Supabase → **Authentication → URL Configuration** y añade la URL
   de Vercel como `Site URL` y `Redirect URL` (para que los emails de reset
   funcionen).

## 4. Jugar con tus amigos

1. Cada uno se registra en `https://tu-app.vercel.app/register` con su
   email, un `@usuario` único (3-24, minúsculas) y una contraseña.
2. En `/friends` se buscan mutuamente por `@usuario` y se envían invitaciones.
3. Al aceptar, la comparativa semanal aparece automáticamente (los datos viajan
   por Postgres con Row Level Security: solo aliados aceptados ven tus stats).

## Arquitectura

- **Auth**: `supabase.auth` (email + password). El trigger `on_auth_user_created`
  crea el `profiles` con `friend_code` único al registrarse.
- **Datos**: toda la app lee/escribe directamente contra Supabase usando
  `@supabase/supabase-js` desde el navegador. Las políticas RLS garantizan
  que cada usuario solo vea/edite lo suyo.
- **Sincronía entre dispositivos**: al hacer login, `NovaFitProvider` hidrata
  rutinas + sesiones + amigos desde Postgres. Las mutaciones son optimistas
  (UI inmediata) con rollback si la DB rechaza.

## Detalles

- El plan gratuito de Supabase pausa el proyecto tras **7 días sin actividad**.
  Basta con abrir la app para despertarlo.
- Si mueves el repo a OneDrive/Dropbox verás el warning *Slow filesystem*
  de Next.js. Para desarrollo cómodo, mantén el repo fuera de esas carpetas.
- Los datos antiguos guardados en `localStorage` (antes de migrar a Supabase)
  **no se migran automáticamente**. Si te interesa conservarlos avísame y
  escribimos un script one-shot.
