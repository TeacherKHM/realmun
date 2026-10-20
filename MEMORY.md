# MEMORY.md — datos que no deben perderse

Resumen operativo de RealMUN. Si algo de aquí cambia, se actualiza este archivo.

## Despliegue en Vercel

| Dato | Valor |
| --- | --- |
| URL de producción | **https://realmun.vercel.app** |
| Proyecto | `realmun` (`prj_ZtiKqQtJcZAB8jJDf7XrELOEvSVD`) |
| Cuenta | `k-hintze-m-7199` |
| Equipo | `k-hintze-m-7199s-projects` (`team_peN3afQNFY9g8c8lVvAUrYsA`) |
| Repositorio | `origin` → `github.com/TeacherKHM/realmun` · push a `main` despliega a producción |

Variables de entorno cargadas en **Production, Preview y Development**:

```
NEXT_PUBLIC_SUPABASE_URL=https://lshgixbdzkfbjmjfbbvn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_gKCdlT2u_FRSB07GaMibFA_Vqmmo4dY
```

Comandos de despliegue:

```bash
vercel link --yes --project realmun   # ya hecho
vercel env ls                         # lista las variables cargadas
vercel --prod                         # publica a producción
```

> El sitio quedó **público**: la protección de despliegue de Vercel no bloquea las rutas,
> comprobado con `curl` (portada, login, TV y API responden sin sesión de Vercel).

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

La **clave secreta** (`SUPABASE_SECRET_KEY`, formato `sb_secret_…`, o la legacy `SUPABASE_SERVICE_ROLE_KEY`) se usa **solo en el servidor** para dos cosas: cambiar contraseñas de comités (`/panel/comites`) y limitar los intentos de acceso (tabla `login_attempts`). Se crea en el dashboard: *Project Settings → API Keys → Create new secret key*; se pone en `.env.local` y en Vercel (Production y Preview). El gateway de Supabase la traduce a `service_role`, así que sirve para el Admin API. **Sin ella**, el cambio de contraseñas se desactiva y el límite de intentos falla abierto; el resto funciona.

> La que hubo en `.env.local` durante la Etapa 8 (`vck_…`) era un token de Vercel, no de Supabase: el Admin API devuelve `401 Invalid API key`.

## Acceso de los encargados

Contraseña inicial de los cuatro comités: **`comite-2026`** (cambiar antes del evento).

| Comité | Correo | Ruta |
| --- | --- | --- |
| COM I | `comite-1@realmun.mx` | `/comite/comite-1` |
| COM II | `comite-2@realmun.mx` | `/comite/comite-2` |
| COM III | `comite-3@realmun.mx` | `/comite/comite-3` |
| COM IV | `comite-4@realmun.mx` | `/comite/comite-4` |

## Acceso de la dirección

Cuenta única del presidente / encargado general. Contraseña inicial: **`direccion-2026`** (cambiar antes del evento).

| Rol | Correo | Ruta | `profiles.role` |
| --- | --- | --- | --- |
| Dirección | `direccion@realmun.mx` | `/panel` y `/panel/comites` | `direccion` |

- Ve **todos** los comités en una sola vista (sesión, delegados en sala, sanciones, hojas y rúbrica) y se refresca solo cada 15 s.
- **Entra a la consola de cualquier comité** (`/comite/<code>`) con la misma cuenta: atiende asistencia, cronómetro, sanciones, hojas, rúbrica, delegados y sesiones en los cuatro. El riel muestra «← Panel de dirección» y el encabezado una etiqueta «Vista de dirección».
- **Edita el catálogo** en `/panel/comites`: nombre, sigla, tema y color de cada comité, más el nombre del encargado. La portada, las consolas y la TV lo reflejan al guardar.
- Un encargado de comité **no** puede abrir `/panel` ni la consola de otro comité: la app lo regresa a la suya, la RPC `direccion_stats()` lo rechaza y el RLS no le deja escribir fuera.
- La fila de `profiles` exige `committee_id`, así que la cuenta de dirección apunta al primer comité; no afecta al panel (ese lee por la RPC).
- Para dar de alta más cuentas de dirección: crear la cuenta en Supabase Auth, insertar su fila en `profiles` y poner `role = 'direccion'`.

Cambiar la contraseña de un comité:

- **Desde la app** (recomendado): `/panel/comites` → tarjeta del comité → «Contraseña del comité» (mínimo 10 caracteres). Requiere `SUPABASE_SECRET_KEY` en el servidor; la app usa el Admin API y no guarda la contraseña.
- **SQL de respaldo** (si la clave secreta no está disponible), reemplazar `<code>` y la contraseña:

```sql
update auth.users
set encrypted_password = extensions.crypt('NUEVA-CONTRASENA', extensions.gen_salt('bf'))
where email = '<code>@realmun.mx';
```

La contraseña de la **dirección** todavía no tiene pantalla: se cambia desde el dashboard (Auth → Users) o con el mismo SQL sobre `direccion@realmun.mx`.

## Pantallas para el evento

- Consola del encargado: `https://realmun.vercel.app/comite/comite-1`
- Acceso de la dirección: `https://realmun.vercel.app/direccion`
- Panel de dirección (presidente): `https://realmun.vercel.app/panel`
- Comités y encargados (dirección): `https://realmun.vercel.app/panel/comites`
- Pantalla de TV (sin login, abrir en la TV): `https://realmun.vercel.app/vista-tv/comite-1`
- Marcador público de la TV: `GET /api/tv/comite-1` (sondeo cada segundo)

## Esquema de datos (proyecto remoto)

| Tabla | Contenido |
| --- | --- |
| `committees` | 4 comités: `code`, `sigla`, `name`, `topic`, `accent`, `active_session_id` |
| `profiles` | Vincula `auth.users` → comité (una cuenta por comité); `role` = `encargado` \| `direccion` |
| `sessions` | Sesiones con fecha y estado; la activa se guarda en `committees.active_session_id` |
| `delegates` | Delegados del comité (`name`, `delegation`, `active`, `sort_order`) |
| `attendance` | Único par (sesión, delegado): `presente` / `retardo` / `justificado` / `ausente` |
| `sanctions` | `amonestacion` / `advertencia` / `disciplina` con motivo y sesión |
| `resolutions` | Hojas entregadas: versión incremental + hora + nota |
| `rubric_scores` | `scores` jsonb (4 criterios 1–10) + comentario, único por sesión y delegado |
| `timer_state` | Una fila por comité: `mode`, `running`, `ends_at`, `remaining_ms`, `started_at`, `elapsed_ms`, `speaker`, `label` |
| `login_attempts` | Intentos de acceso fallidos (`account` e `ip_hash` hasheados, `ok`, `created_at`). RLS sin políticas: solo la usa el servidor con la clave secreta. Base del límite de 5 fallos / 15 min por cuenta+IP. |

Funciones y políticas:

- `public.current_committee_id()` — comité del usuario autenticado (usada por todas las policies).
- `public.committee_tv_stats(text)` — marcador público de la TV (security definer, sin motivos de sanción).
- `public.is_direccion()` — ¿la cuenta es de la dirección? (security definer, `execute` solo para `authenticated`; la usan las policies de dirección).
- `public.direccion_stats()` — radiografía de los 4 comités para `/panel` (security definer; se niega si la cuenta no tiene `role = 'direccion'`; `execute` solo para `authenticated`).
- Policies: catálogo de comités público; `timer_state` de lectura pública y escritura del propio comité; todo lo demás solo el comité dueño. `profiles` solo la fila propia.
- Policies `*_direccion` (se **suman** por OR a las del comité, no las sustituyen): `committees`, `profiles` y las 7 tablas por comité dejan a la dirección leer y escribir en cualquiera. La dirección queda encerrada a las demás cuentas.
- Realtime activado en `timer_state` (la TV usa sondeo HTTP, no realtime, para reducir fallos).

## Comandos útiles

```bash
npm run dev                      # desarrollo en localhost:3000
npx next typegen                 # tipos de rutas después de crear rutas nuevas
npm run build                    # verificación antes de desplegar
vercel --prod                    # publicar (el proyecto ya está vinculado)
```

## Decisiones que no hay que re-descubrir

- Las **hojas de resolución** se registran a mano por el encargado (control de entrega), no hay subida de archivos.
- La **rúbrica** son 4 criterios configurables en `src/lib/types.ts`; escala 1–10, promedio calculado en el cliente del servidor (`rubricAverage`).
- La **TV no se autentica**; solo ve datos públicos por la función `committee_tv_stats` y `timer_state`.
- El **nombre de cada comité, sigla, tema y color**, y el **nombre del encargado**, se editan desde `/panel/comites` (solo la dirección). Antes se hacía directo en la tabla `committees`.
- Las **cuentas de Auth creadas por SQL** deben dejar en `''` (no `NULL`) `recovery_token`, `email_change`, `email_change_token_new/current`, `phone_change*` y `reauthentication_token`: con `NULL` GoTrue responde `500 Database error querying schema` al iniciar sesión.
- Las **horas y fechas se formatean en `America/Mexico_City`** (`src/lib/format.ts`): Vercel corre en UTC y, sin fijar la zona, las horas salían corridas 6 horas.
- Las **server actions de la consola reciben el código del comité** como primer argumento: cada `<form>` lo ata con `action={accion.bind(null, committee.code)}` y `guardCommittee(code)` resuelve el comité destino (el propio para un encargado, cualquiera para la dirección). Así la dirección no escribe por error en el comité de su `profiles`. Si algún formulario nuevo olvida el `.bind`, para la dirección caería en su propio comité: hay que atarlo siempre.
- El **proyecto de Supabase es el mismo para local y producción**: las pruebas de punta a punta contra `https://realmun.vercel.app` tocan los datos reales. Las pruebas que mutan (asistencia, delegados, nombres) se restauran solas o se limpian a mano al terminar.
- El agente que construyó esto **no puede ver imágenes**: cualquier revisión visual la debe hacer una persona.
