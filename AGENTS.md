<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# RealMUN — bitácora de desarrollo

Consola de comités del modelo de Naciones Unidas del **Instituto Real de San Luis**.
Stack: **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + Supabase**, desplegado en Vercel.

> Las constantes críticas (IDs, llaves, contraseñas, comandos) viven en `MEMORY.md`.
> Este archivo es la bitácora: se actualiza al cerrar cada etapa.

## Cómo correr el proyecto

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # build de producción
npx next typegen   # regenera los tipos de rutas (PageProps/LayoutProps) tras crear rutas nuevas
```

Requiere `.env.local` (ver `.env.local.example`).

## Alcance

- **Portada** con los 4 comités como placas de delegación; enlace a la pantalla de TV de cada uno.
- **Login por comité**: una cuenta Supabase Auth por comité; la contraseña es compartida dentro del comité.
- **Consola del comité** (`/comite/[code]`) con secciones: resumen, asistencia, cronómetro, sanciones, hojas de resolución, rúbrica, delegados y sesiones.
- **Panel de dirección** (`/panel`): cuenta única de la dirección (presidente o encargado general) con la radiografía de los 4 comités en una sola vista. No puede abrirlo una cuenta de comité.
- **Pantalla de TV** (`/vista-tv/[code]`): cronómetro gigante, comité, orador y marcador; sin login, sincronizada cada segundo.
- **Sesiones múltiples**: la sesión activa vive en `committees.active_session_id` y define qué se ve en consola y TV.
- **Rúbrica**: 4 criterios (1–10) definidos en `src/lib/types.ts` → `RUBRIC_CRITERIA`.

## Arquitectura

| Ruta | Rol |
| --- | --- |
| `src/app/page.tsx` | Portada con las placas |
| `src/app/login/page.tsx` + `src/components/LoginForm.tsx` | Acceso por comité o por dirección |
| `src/app/comite/[code]/**` | Consola (layout con riel de navegación y selector de sesión) |
| `src/app/panel/**` | Panel de dirección (layout con encabezado y tarjeta por comité) |
| `src/app/vista-tv/[code]/page.tsx` + `src/components/TvBoard.tsx` | Pantalla de TV |
| `src/app/api/tv/[code]/route.ts` | Endpoint que consulta la TV cada segundo |
| `src/proxy.ts` | Protección de `/comite/*` y `/panel/*` y refresco de la sesión |
| `src/app/actions/*.ts` | Server actions por dominio |
| `src/lib/*` | Acceso a datos, sesión, formato y tipos |
| `supabase/migrations/*.sql` | Esquema aplicado al proyecto remoto |

Notas de implementación:

- **Next 16**: `proxy.ts` sustituye a `middleware.ts`; `params` y `searchParams` son promesas; `cookies()` es asíncrono. Los tipos `PageProps<'/ruta'>` y `LayoutProps<'/ruta'>` se generan con `next typegen`.
- **Datos**: todo pasa por server actions con el cliente Supabase ligado a la sesión del encargado (RLS real). Las mutaciones se validan en `src/lib/guard.ts` y refrescan la consola con `revalidateConsole`.
- **Cronómetro**: estado en `timer_state` (una fila por comité). `ends_at` + `started_at` permiten que consola y TV calculen el tiempo con reloj de servidor, sin depender de latencia; `LiveTimer` avanza localmente cada 200 ms.
- **TV**: el sondeo a `/api/tv/[code]` cada segundo trae cronómetro y marcador (la función `committee_tv_stats` es `security definer` y no expone motivos de sanción).
- **Roles**: `profiles.role` es `'encargado'` (una cuenta por comité) o `'direccion'`. `src/lib/auth.ts` expone `requireSession()` (cualquier cuenta), `requireCommittee(code)` (solo su comité) y `requireDireccion()` (solo la dirección; a las demás las manda a su consola).
- **Panel de dirección**: la RPC `direccion_stats()` es `security definer`, recibe `auth.uid()` y **se niega a sí misma** si esa cuenta no tiene `role = 'direccion'` (así el RLS de las tablas, atado al comité, no estorba). Devuelve los 4 comités en un solo llamado. El panel se refresca solo cada 15 s con `AutoRefresh` + `router.refresh()`, sin recargar la página.
- **Diseño**: no hay Tailwind config file; los tokens viven en `src/app/globals.css` (`@theme`). Tipografías: Instrument Serif (display), Public Sans (interfaz), Archivo (reloj). Clases propias: `.placard`, `.btn*`, `.panel`, `.field`, `.rail-link`, `.clock`.
- `cacheComponents` se dejó **desactivado** a propósito: el panel es dinámico de punta a punta.

## Bitácora

### Etapa 1 — Cimientos (completada)

- Proyecto Next 16 + TS + Tailwind 4 creado en `Documents/RealMUN`; repositorio git propio inicializado.
- Proyecto Supabase `realmun` creado vía MCP (ref `lshgixbdzkfbjmjfbbvn`, región us-east-1, plan free).
- Migraciones aplicadas: tablas (`committees`, `profiles`, `sessions`, `delegates`, `attendance`, `sanctions`, `resolutions`, `rubric_scores`, `timer_state`), RLS con `current_committee_id()`, catálogo público de comités, lectura pública de `timer_state`, función pública `committee_tv_stats`, realtime para `timer_state`.
- Cuentas de encargado creadas por comité + `profiles` vinculados. Login probado contra `/auth/v1/token`.
- Frontend completo: portada de placas, login, consola con 7 secciones, pantalla de TV y endpoint de sondeo.
- Verificado: `tsc --noEmit` limpio, `npm run build` correcto, todas las rutas responden (públicas 200, `/comite/*` sin sesión 307 a `/login`), RLS bloquea escrituras y lecturas cruzadas (403 / lista vacía), datos reales renderizados en consola y TV.

### Etapa 2 — Prueba de punta a punta en navegador (completada)

Se condujo Chrome real (puppeteer-core sobre el Chrome del sistema) contra el servidor de desarrollo. Las 15 comprobaciones pasan y **no hay errores de JavaScript**:

| Comprobación | Resultado |
| --- | --- |
| Portada con las 4 placas | OK |
| `/comite/comite-1` sin sesión manda a `/login?next=…` | OK |
| Login con la contraseña del comité entra a la consola | OK |
| Asistencia marca *Presente* y el estado persiste | OK |
| Preset *Discurso* arranca una cuenta regresiva de 1:00 | OK |
| La TV (pestaña limpia, sin sesión) muestra el **mismo** tiempo | OK (consola 0:59 / TV 0:57) |
| La TV muestra sigla, sesión y marcador | OK |
| Registrar sanción desde la consola | OK |
| Guardar evaluación de la rúbrica | OK |
| Hojas de resolución, delegados y sesiones cargan | OK |
| La sesión del comité 1 no abre el comité 2 (redirige al propio) | OK |

Correcciones derivadas de la prueba:

- La TV escribía **«Amonestacións»** al pluralizar con un simple `+ "s"`. Ahora usa
  `SANCTION_PLURAL_LABELS` en `src/lib/types.ts` («Amonestaciones», «Advertencias», «Disciplina»).
- Se comprobó que el desfase de hidratación que apareció en la primera pasada lo provocaba
  el propio guion de prueba (mutaba el DOM antes de que React hidratara), no la aplicación.

### Etapa 3 — Esquinas redondeadas (completada)

Las superficies del panel se redondean con una escala por jerarquía, no con un solo radio para todo:

| Token | Valor | Se usa en |
| --- | --- | --- |
| `--radius-card` | 12px | paneles (`.panel`), tarjetas de dato, bloques reloj, aviso punteado, tarjeta del login |
| `--radius-control` | 8px | botones (`.btn`), campos (`.field`), filas de lista, tarjetas del menú de delegados, alerta de error |
| `--radius-placard` | 8px | placas de delegación |
| `--radius-chip` | pill | etiquetas de estado: activa, activo/inactivo, en curso, tipo de sanción |

Reglas que quedaron fijas:

- Las **marcas de bandera** (las barras de acento y los recuadros de color) siguen **rectas**: solo las superficies se redondean, para que el acento siga leyéndose como bandera.
- El riel de navegación redondea solo su borde interior (`0 var(--radius-control) …`), dejando el borde izquierdo a ras del panel oscuro.
- La pantalla de TV se dejó **a sangre** (sin tarjetas): es una proyección, no un panel de trabajo.

> Nota: Tailwind 4 en modo desarrollo puede servir un fragmento de CSS en caché; si un cambio de
> `globals.css` no se ve, hay que forzar la recompilación antes de dudar del código.

### Etapa 4 — Despliegue a producción (completada)

El proyecto se desplegó a **https://realmun.vercel.app** con el CLI 64.2.0:

- `vercel link --yes --project realmun` → vinculado a `k-hintze-m-7199s-projects/realmun` (`prj_ZtiKqQtJcZAB8jJDf7XrELOEvSVD`).
- Variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) cargadas en Production, Preview y Development.
- `vercel --prod` → despliegue correcto (sin protección activa que bloquee las rutas).
- Comprobación de rutas: `/` 200, `/login` 200, `/vista-tv/comite-1` 200, `/api/tv/comite-1` 200, `/comite/comite-1` → 307 a `/login`.
- Prueba de punta a punta con Chrome real contra producción: todas las 15 comprobaciones pasan, sin errores de JavaScript (login, asistencia, cronómetro, TV, sanciones, rúbrica, hojas, delegados, sesiones y bloqueo entre comités).
- El marcador de la TV en producción muestra correctamente «Amonestaciones» (plural corregido).

### Etapa 5 — Panel de dirección (completada)

Vista global para el presidente / encargado general del modelo, en **`/panel`**:

- **Rol nuevo**: `profiles.role` (`'encargado'` | `'direccion'`). `src/lib/auth.ts` gana `requireDireccion()`; `committeeSession` ahora lleva el rol. Migración `0006_direccion_dashboard.sql`.
- **RPC `direccion_stats()`**: `security definer`, un solo llamado para los 4 comités (comité, sesión activa, delegados activos, presencia, sanciones por tipo, hojas, avance y promedio de rúbrica, cronómetro). Verifica `auth.uid()` contra `profiles.role` y lanza `42501` si la cuenta no es de dirección. `execute` solo para `authenticated`.
- **Cuenta de dirección**: `direccion@realmun.mx`, vinculada a un `profiles` con `role = 'direccion'` (la fila exige `committee_id`, así que apunta al primer comité; el RLS del comité le queda de sobra y la RPC no lo usa). Credenciales en `MEMORY.md`.
- **Interfaz**: `/panel` con encabezado oscuro y banda de acentos (uno por comité), marcador global (comités en sesión, delegados en sala, sanciones, hojas) y una tarjeta por comité con sesión, cronómetro vivo, barra de presencia, sanciones, hojas, rúbrica y enlace a su TV. Se refresca solo cada 15 s (`AutoRefresh`) o con «Actualizar ahora» (`RefreshButton`).
- **Login**: el formulario ofrece la opción **Dirección**; `signIn` resuelve el correo (`direccion@realmun.mx`) y aterriza en `/panel`. Con `next=/panel` la opción queda preseleccionada.
- **Protección**: `proxy.ts` cubre `/comite/:path*` y `/panel/:path*`; además `requireDireccion()` manda a su consola a cualquier cuenta que no sea de dirección.

Verificación (Chrome real contra el servidor de desarrollo, `puppeteer-core`):

| Comprobación | Resultado |
| --- | --- |
| `/panel` sin sesión → `/login?next=/panel` con Dirección preseleccionada | OK |
| Login de dirección entra al panel | OK |
| El panel lista los 4 comités, cada uno con su acento y su enlace de TV | OK |
| Cada tarjeta muestra sesión, presencia, sanciones, hojas y rúbrica | OK |
| Marcador global (comités en sesión / delegados / sanciones / hojas) | OK |
| «Actualizar ahora» no rompe la vista | OK |
| Una cuenta de comité no abre `/panel` (307 a su consola) | OK |
| La TV sigue pública | OK |
| La consola y el login de comités siguen intactos; TV y reloj renderizan | OK |
| Sin errores de JavaScript | OK |

Detalles técnicos de la consulta: la verificación de rol va **dentro** de la función (`insufficient_privilege`), no en una política, para no reescribir el RLS existente. `TimerDisplay`/`LiveTimer` ganaron un prop `compact` (por defecto `false`) para el reloj de las tarjetas, sin tocar consola ni TV.

> Sobre la creación de la cuenta: se hizo por SQL (`auth.users` + `auth.identities` + `profiles`). GoTrue exige que `recovery_token`, `email_change`, `email_change_token_new/current`, `phone_change*` y `reauthentication_token` queden en `''` y no en `NULL`; con `NULL` el login devuelve `500 Database error querying schema`. Ya quedó corregido.

**Desplegado a producción** (`vercel --prod`): `/` 200, `/login` 200, `/panel` 307 a `/login?next=/panel` sin sesión, `/vista-tv/comite-1` 200, `/api/tv/comite-1` 200. Las 24 comprobaciones del panel y la regresión de consola/TV pasan contra `https://realmun.vercel.app` y no hay errores de JavaScript.

> Zona horaria: al probar en producción se vio que `formatTime`/`formatDateTime` renderizaban en **UTC** (Vercel) y no en la hora de San Luis. `src/lib/format.ts` ahora fija `timeZone: "America/Mexico_City"` en sus tres `Intl.DateTimeFormat`; esto también corrige las horas de sanciones y hojas en la consola, que estaban corridas 6 horas en producción.

### Pendientes

- Captura de pantalla revisada por una persona (el agente de esta sesión no puede ver imágenes). Capturas de producción en `~/Desktop/RealMUN-capturas/`: `15-panel-login.png`, `12-panel-direccion.png`, `13-panel-direccion-900.png` y `14-panel-direccion-movil.png`.
- Nombres reales de los comités, temas y plantilla de delegados (hoy son genéricos).
- Cambiar la contraseña por defecto de los comités **y de la dirección**.
- Conectar un remoto git a GitHub si se desea habilitar auto-deploy por push (no configurado aún).
- Si se quiere más de una cuenta de dirección, repetir el alta y poner `role = 'direccion'`.
