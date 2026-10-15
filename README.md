# RealMUN

Consola de comités del modelo de Naciones Unidas del **Instituto Real de San Luis**.

Cada comité tiene su propia consola con cronómetro para la televisión, pase de
asistencia, registro de amonestaciones, advertencias y disciplina, control de
hojas de resolución y rúbrica de evaluación por delegado.

## Qué incluye

- **Portada** con los comités como placas de delegación.
- **Acceso por comité** con contraseña (una cuenta por comité).
- **Consola del comité**: resumen, asistencia, cronómetro, sesiones, sanciones,
  hojas de resolución, rúbrica y plantilla de delegados.
- **Pantalla de TV** (`/vista-tv/comite-1`): cronómetro gigante, comité, orador en
  el atril y marcador de la sesión, sincronizada sin recargar.
- **Sesiones múltiples** con fecha; todo el registro se acumula por sesión.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth + RLS) · Vercel

## Empezar

```bash
npm install
cp .env.local.example .env.local   # llena la URL y la llave pública de Supabase
npm run dev
```

Abre <http://localhost:3000>.

## Documentación

- [`AGENTS.md`](./AGENTS.md) — bitácora de desarrollo, arquitectura y decisiones.
- [`MEMORY.md`](./MEMORY.md) — proyecto Supabase, cuentas de acceso, esquema y comandos.
- `supabase/migrations/` — esquema aplicado al proyecto remoto.
