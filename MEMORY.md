# MEMORY.md — datos que no deben perderse

Resumen operativo de RealMUN. Si algo de aquí cambia, se actualiza este archivo.

## Proyecto Supabase

| Dato | Valor |
| --- | --- |
| Nombre | `realmun` |
| Project ref / ID | `lshgixbdzkfbjmjfbbvn` |
| URL | `https://lshgixbdzkfbjmjfbbvn.supabase.co` |
| Región | `us-east-1` |
| Organización | `k-hintze-m-7199's projects` (`vercel_icfg_cLAgeWPG0gq2v0bYutcYcfcJ`) |
| Plan | Free ($0 USD/mes) |

Llave pública usada por la app (va en `.env.local`, no es secreta):

```
NEXT_PUBLIC_SUPABASE_URL=https://lshgixbdzkfbjmjfbbvn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_gKCdlT2u_FRSB07GaMibFA_Vqmmo4dY
```

La *secret key* / `service_role` **no se usa** en este proyecto: todo el acceso pasa por RLS con la sesión del encargado.

## Acceso de los encargados

Contraseña inicial de los cuatro comités: **`comite-2026`** (cambiar antes del evento).

| Comité | Correo | Ruta |
| --- | --- | --- |
| COM I | `comite-1@realmun.mx` | `/comite/comite-1` |
| COM II | `comite-2@realmun.mx` | `/comite/comite-2` |
| COM III | `comite-3@realmun.mx` | `/comite/comite-3` |
| COM IV | `comite-4@realmun.mx` | `/comite/comite-4` |

Cambiar la contraseña (SQL en el proyecto, reemplazar `<code>`):

```sql
update auth.users
set encrypted_password = extensions.crypt('NUEVA-CONTRASENA', extensions.gen_salt('bf'))
where email = '<code>@realmun.mx';
```

## Pantallas para el evento

- Consola del encargado: `https://<dominio>/comite/comite-1`
- Pantalla de TV (sin login, abrir en la TV): `https://<dominio>/vista-tv/comite-1`
- Marcador público de la TV: `GET /api/tv/comite-1` (sondeo cada segundo)

## Esquema de datos (proyecto remoto)

| Tabla | Contenido |
| --- | --- |
| `committees` | 4 comités: `code`, `sigla`, `name`, `topic`, `accent`, `active_session_id` |
| `profiles` | Vincula `auth.users` → comité (una cuenta por comité) |
| `sessions` | Sesiones con fecha y estado; la activa se guarda en `committees.active_session_id` |
| `delegates` | Delegados del comité (`name`, `delegation`, `active`, `sort_order`) |
| `attendance` | Único par (sesión, delegado): `presente` / `retardo` / `justificado` / `ausente` |
| `sanctions` | `amonestacion` / `advertencia` / `disciplina` con motivo y sesión |
| `resolutions` | Hojas entregadas: versión incremental + hora + nota |
| `rubric_scores` | `scores` jsonb (4 criterios 1–10) + comentario, único por sesión y delegado |
| `timer_state` | Una fila por comité: `mode`, `running`, `ends_at`, `remaining_ms`, `started_at`, `elapsed_ms`, `speaker`, `label` |

Funciones y políticas:

- `public.current_committee_id()` — comité del usuario autenticado (usada por todas las policies).
- `public.committee_tv_stats(text)` — marcador público de la TV (security definer, sin motivos de sanción).
- Policies: catálogo de comités público; `timer_state` de lectura pública y escritura del propio comité; todo lo demás solo el comité dueño. `profiles` solo la fila propia.
- Realtime activado en `timer_state` (la TV usa sondeo HTTP, no realtime, para reducir fallos).

## Comandos útiles

```bash
npm run dev                      # desarrollo en localhost:3000
npx next typegen                 # tipos de rutas después de crear rutas nuevas
npm run build                    # verificación antes de desplegar
vercel                           # primer deploy (requiere `vercel login`)
```

## Decisiones que no hay que re-descubrir

- Las **hojas de resolución** se registran a mano por el encargado (control de entrega), no hay subida de archivos.
- La **rúbrica** son 4 criterios configurables en `src/lib/types.ts`; escala 1–10, promedio calculado en el cliente del servidor (`rubricAverage`).
- La **TV no se autentica**; solo ve datos públicos por la función `committee_tv_stats` y `timer_state`.
- El nombre de cada comité, sigla, tema y color se edita directo en la tabla `committees` (no hay UI de administración todavía).
- El agente que construyó esto **no puede ver imágenes**: cualquier revisión visual la debe hacer una persona.
