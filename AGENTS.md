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
- **Dirección con acceso total**: la misma cuenta entra a la consola de **cualquier** comité (asistencia incluida) y edita desde `/panel/comites` los nombres de comités, siglas, temas, colores y el nombre de cada encargado.
- **Pantalla de TV** (`/vista-tv/[code]`): cronómetro gigante, comité, orador y marcador; sin login, sincronizada cada segundo.
- **Sesiones múltiples**: la sesión activa vive en `committees.active_session_id` y define qué se ve en consola y TV.
- **Rúbrica**: 4 criterios (1–10) definidos en `src/lib/types.ts` → `RUBRIC_CRITERIA`.

## Arquitectura

| Ruta | Rol |
| --- | --- |
| `src/app/page.tsx` | Portada con las placas |
| `src/app/login/page.tsx` + `src/components/LoginForm.tsx` | Acceso por comité o por dirección |
| `src/app/comite/[code]/**` | Consola (layout con riel de navegación y selector de sesión) |
| `src/app/panel/**` | Panel de dirección: `/panel` (radiografía), `/panel/rubrica` (rúbrica del presidente) y `/panel/comites` (edita comités y encargados) |
| `src/app/vista-tv/[code]/page.tsx` + `src/components/TvBoard.tsx` | Pantalla de TV |
| `src/app/direccion/page.tsx` + `src/components/DireccionForm.tsx` | Acceso propio de la dirección (sin listar comités, `noindex`) |
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
- **Roles**: `profiles.role` es `'encargado'` (una cuenta por comité) o `'direccion'`. `src/lib/auth.ts` expone `requireSession()` (cualquier cuenta), `requireCommittee(code)` (solo su comité; **la dirección puede resolver cualquier `code`**) y `requireDireccion()` (solo la dirección; a las demás las manda a su consola).
- **Comité destino de una mutación**: como la consola se puede abrir desde cuentas distintas, cada `<form>` de la consola ata el comité con `action={accion.bind(null, committee.code)}`; la action recibe `(code, formData)` y usa `guardCommittee(code)` (el propio comité para un encargado, cualquiera para la dirección). Nunca se confía en el comité del `profiles`.
- **Acceso de la dirección a los comités**: la RPC `direccion_stats()` sigue siendo la vía de lectura global, pero para *entrar y escribir* la dirección usa la consola normal apoyada en las policies `*_direccion` (`public.is_direccion()`), que se **suman por OR** a las del comité sin reescribirlas.
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

### Etapa 6 — La dirección entra y edita todos los comités (completada)

La dirección ya no solo *ve* la radiografía: **entra a la consola de cualquier comité** (asistencia, cronómetro, sanciones, hojas, rúbrica, delegados y sesiones) y **edita el catálogo** (nombres de comité, sigla, tema, color y nombre del encargado).

- **Migración `0007_direccion_acceso.sql`** (aplicada al proyecto remoto): `public.is_direccion()` (`security definer`, `execute` solo para `authenticated`) y policies `*_direccion` en `committees`, `profiles` y las 7 tablas por comité. Son **permisivas**: se suman por OR a las del comité, así que el encargado sigue encerrado en el suyo y la dirección no reescribe el RLS.
- **Comité destino de cada mutación**: las acciones ahora reciben `(code, formData)`; los 32 formularios de la consola se atan con `action={accion.bind(null, committee.code)}` y `guardCommittee(code)` resuelve el comité (propio para el encargado, cualquiera para la dirección). Sin esto, la dirección habría escrito siempre en el comité de su `profiles`.
- **`requireCommittee(code)`** acepta cualquier `code` para la dirección (404 si no existe); para un encargado sigue redirigiendo a su consola.
- **Consola con voz de dirección**: el riel muestra «← Panel de dirección» y el encabezado una etiqueta «Vista de dirección» (`NavRail` gana `isDireccion`).
- **Página `/panel/comites`** (nueva) + `src/app/actions/committees.ts` (`updateCommittee`, `updateEncargado`): un panel por comité para nombre/sigla/tema/color y el nombre del encargado; los cambios se reflejan en portada, consolas y TV. El panel gana pestañas («Radiografía» / «Comités y encargados») y cada tarjeta enlaza consola, asistencia, delegados y TV.

Verificación (Chrome real, `puppeteer-core`, servidor local **y** producción):

| Comprobación | Resultado |
| --- | --- |
| `/panel/comites` sin sesión → `/login?next=/panel/comites`, Dirección preseleccionada | OK |
| La dirección entra y el panel ofrece las dos pestañas | OK |
| La administración lista los 4 comités, cada uno con su campo de encargado | OK |
| Cada tarjeta de la radiografía enlaza consola, asistencia, delegados y TV | OK |
| La dirección abre la consola del comité 3 (no la manda a la suya) con etiqueta «Vista de dirección» y enlace al panel | OK |
| La dirección registra asistencia en el comité 3 y **la fila queda en el comité 3** (no en el 1) | OK |
| La dirección agrega y elimina un delegado en el comité 3 | OK |
| La dirección cambia nombre, tema y encargado del comité 3 y la portada lo refleja | OK |
| Restauración de los datos originales | OK |
| El encargado del comité 2 no abre `/panel/comites` ni la consola del 3 | OK |
| El encargado sigue agregando/eliminando delegados en **su** comité (regresión del `.bind`) | OK |
| Flujo completo de consola (asistencia, cronómetro, TV, sanciones, rúbrica, hojas, delegados, sesiones) | OK |
| Sin errores de JavaScript | OK |

Se verificó en la base que la asistencia escrita por la dirección quedó en `comite-3` con `comite-1` en cero: el comité destino es el de la ruta, no el del `profiles`. Los datos de prueba (asistencia, delegados, nombre/acento del comité) se restauraron al terminar.

**Desplegado a producción** (`vercel --prod`): `/` 200, `/login` 200, `/vista-tv/comite-1` 200, `/api/tv/comite-1` 200, y `/comite/comite-1`, `/panel`, `/panel/comites` con 307 a `/login?next=…` sin sesión. Las 25 comprobaciones de la dirección, las 24 del panel y las 10 de regresión (consola/TV/aislamiento) pasan contra `https://realmun.vercel.app`.

> Ajuste: `is_direccion()` se dejó **sin** `execute` para `anon` (`revoke ... from public, anon`), a diferencia de `current_committee_id()` y `committee_tv_stats()`, que sí lo necesitan. Los avisos de Supabase quedan en el patrón `security definer` ya aceptado.

### Etapa 7 — Pasada de diseño y accesibilidad (completada, sin migraciones)

Se revisó toda la interfaz con dos lentes: **dirección de arte** (frontend-design) y **cumplimiento** (Web Interface Guidelines). No se tocó el esquema.

**Concepto**: la app es una *mesa de sesión*. Lo único ruidoso son la **placa de delegación** y la **franja de bandera**; todo lo demás es papelería quieta. De ahí salieron dos correcciones de fondo:

1. La portada conserva el vuelo y la inclinación 3D de las placas; el panel de dirección **no**: sus tarjetas son superficies de trabajo (`.placard[data-flat]`). Antes el mismo gesto decorativo se leía en las dos pantallas y el panel parecía una portada.
2. Se retiró la repetición de tarjetas de número grande: las cifras del panel y de la consola van con `tabular-nums`, jerarquía tipográfica y sin cajas idénticas.

**Contraste medido** (no estimado):

| Token | Antes | Ahora | Ratio |
| --- | --- | --- | --- |
| `--color-gold` | `#c9a227` | `#94700f` | 2.42:1 → **4.58:1** (texto y texto blanco encima) |
| `--color-edge` (nuevo) | `--color-line` 1.38:1 | `#7d8fa8` | **3.30:1** en bordes de `.field` y `.btn-quiet` |
| blancos sobre `ink` | `/45` 4.35:1 | `/55`–`/75` | **5.80:1**–**9.7:1** |

**Accesibilidad y semántica**

- Enlace «Saltar al contenido» único en el layout raíz; destino `#contenido` en portada, login, consola, panel y TV. Se eliminaron los duplicados por página y los `id` repetidos (portada y login tenían dos).
- La consola pasó de `<div>` a `<main>`; el riel es `<aside aria-label>`; enlace activo con `aria-current="page"`.
- Asistencia: estado elegido **relleno** (antes solo un anillo), `aria-pressed` y resumen `role="status" aria-live="polite"`.
- Acciones destructivas (limpiar asistencia, quitar sanción/hoja, eliminar delegado/sesión, borrar evaluación) piden confirmación con `ConfirmSubmitButton` (`window.confirm`).
- Login: la etiqueta de contraseña y el botón cambian según se elija comité o dirección (antes decía «Contraseña del comité» con Dirección seleccionada); `Acceso` como título.
- Portada: el conteo sale de los datos («4 comités · elige el tuyo»), «Soy encargado» → «Iniciar sesión», banda de acentos de los 4 comités (mismo recurso que el panel).
- TV: el comité es el `<h1>`; etiquetas de marcador de 12→14 px y blancos `/75` para leerse a distancia de proyección.
- Toque: `touch-action: manipulation` y tap-highlight en enlaces y botones; `color-scheme: light` para los controles nativos.

**Verificación** (Chrome real, `puppeteer-core`, servidor local):

| Suite | Resultado |
| --- | --- |
| `audit-ids.mjs` — 14 rutas: ids duplicados, un solo `h1`, destino del salto, saltos de jerarquía | 14/14 OK, 0 errores JS |
| `verify-ui.mjs` — skip link, tokens, `aria-pressed`, relleno, `data-flat`, tabulares, 360 px | 24/24 OK |
| `regress.mjs` / `panel.mjs` / `direccion.mjs` | 10/10 · 24/24 · 25/25 |
| `eslint --max-warnings=0`, `tsc --noEmit`, `npm run build` | limpios |
| Producción (`https://realmun.vercel.app`): `regress` / `panel` / `direccion` / `audit-ids` / `verify-ui` | 10/10 · 24/24 · 25/25 · 14/14 · 24/24 |

Los e2e se actualizaron para aceptar el diálogo de confirmación (`page.on("dialog", d => d.accept())`); sin eso la eliminación de delegados se quedaba en el `confirm` y fallaba la limpieza. Los datos que escriben las pruebas (asistencia, delegado de prueba) se borraron al terminar: la base quedó en 0 asistencias, 32 delegados, 1 sanción preexistente.

Capturas nuevas (`~/Desktop/RealMUN-capturas/`): `19-portada.png`, `20-portada-movil.png`, `21-login.png`, `22-consola-resumen.png`, `23-consola-asistencia.png`, `24-consola-asistencia-movil.png`, `25-panel.png`, `26-panel-comites.png`, `27-tv.png`; las equivalentes de producción, en `prod/`.

**Desplegado** (`vercel --prod`, producción `realmun-27l9ez8dv`): `/` 200, `/login` 200, `/vista-tv/comite-1` 200, `/api/tv/comite-1` 200; `/comite/*`, `/panel` y `/panel/comites` con 307 a `/login?next=…`. Las cinco suites pasan también contra producción y la base quedó igual que antes de las pruebas (0 asistencias, 32 delegados, 1 sanción preexistente, 4 sesiones).

**Auto-deploy conectado**: el repositorio ya tiene remoto (`origin` → `github.com/TeacherKHM/realmun`) y la integración de Vercel despliega a producción en cada push a `main` (el deploy `realmun-v4w080dpd`, commit `90d2acd`, sustituyó al del CLI y quedó sirviendo `realmun.vercel.app`). `main` se mantiene sincronizado con `origin/main`; ya no hace falta `vercel --prod` para publicar.

### Etapa 8 — Acceso endurecido (completada)

Cuatro frentes, sin tocar el RLS existente:

- **Acceso propio de la dirección** (`/direccion`): una sola contraseña, sin la lista de comités, con `robots: noindex` y enlace discreto desde `/login`. Comparte el mismo `signIn`, así que no hay dos puertas que mantener. `/login` es solo de comités: **no** ofrece la opción Dirección (se retiró después de la primera verificación) y `/login?next=/panel` ya no preselecciona nada.
- **Límite de intentos** (migración `0008_login_throttle.sql`): tabla `login_attempts` con RLS activo y **sin políticas** (solo la usa el servidor con la clave secreta). La cuenta se bloquea a los **5 fallos por cuenta + IP** (o **20 por IP** repartidos entre cuentas) dentro de **15 minutos**; el chequeo ocurre *antes* de llamar a Supabase. Un acceso correcto borra los fallos de esa cuenta+IP y las filas de más de un día se limpian solas. Correo e IP se guardan hasheados (SHA-256 con `LOGIN_HASH_SALT`), nunca en claro.
- **Cambio de contraseñas desde `/panel/comites`**: cada tarjeta tiene su formulario (nueva + repetir, mínimo 10, rechaza la contraseña de fábrica). La server action valida la dirección, busca el `user_id` del comité y aplica la contraseña con el **Admin API** (`updateUserById`) usando `SUPABASE_SECRET_KEY`; nunca se guarda ni se registra. `adminKeyStatus()` comprueba al cargar la página que la clave funcione (cacheado 5 min) y, si falta o no sirve, desactiva el formulario con un aviso en vez de fallar al enviar.
- **Captcha opcional (Turnstile)**: `src/components/Turnstile.tsx` solo se renderiza si existe `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y manda `captchaToken` a `signInWithPassword`. Hay que activarlo también en Supabase (Authentication → Attack Protection) con la llave secreta del mismo widget.
- **Redirección segura**: `next` ya no acepta `//otro-dominio` ni barras invertidas. Antes `startsWith("/")` dejaba pasar `//evil.com` (redirección a otro dominio tras el login).
- **Mensajes**: cualquier fallo de credenciales da el mismo texto; el bloqueo sí se anuncia («Demasiados intentos…»), que es lo útil para quien se equivocó.

Verificado en local (Chrome real, `puppeteer-core`, suite `auth.mjs` con las fases `lock`, `unlock` y `password`):

| Comprobación | Resultado |
| --- | --- |
| `/login` enlaza a `/direccion`; la pantalla no lista comités, no se indexa y envía la cuenta de dirección | OK |
| `/login` lista solo los 4 comités (sin la opción Dirección) | OK |
| 5 fallos seguidos dan siempre el mismo aviso, sin revelar si la cuenta existe | OK |
| Tras 5 fallos la cuenta queda bloqueada y **la contraseña correcta tampoco entra** | OK |
| Limpiando los intentos, la dirección vuelve a entrar | OK |
| La dirección cambia la contraseña de un comité: la vieja deja de servir y la nueva abre | OK |
| Rechazo de contraseñas que no coinciden y de la de fábrica | OK |
| Restauración de la contraseña original (`auth.mjs` la devuelve por el Admin API) | OK |
| Regresión completa (`regress` 10, `panel` 24, `direccion` 25, `audit-ids` 15, `verify-ui` 24) | OK, 0 errores JS |

En la base se comprobó que el límite guarda **5 filas con `ok = false`** y `account`/`ip_hash` de 64 caracteres (SHA-256), nunca el correo ni la IP en claro.

> **Bug real encontrado por la prueba** (y corregido): React 19 limpia el formulario después de cada server action, así que al fallar un acceso el **radio del comité se desmarcaba**; como los radios llevaban `required`, el siguiente clic en «Entrar» no enviaba nada y el usuario se quedaba sin respuesta. Ahora el comité viaja en un `input` oculto (`name="committee"`, los radios pasan a `name="committee-choice"` para agruparse) y el `fieldset` se remonta con `key={state.attempt}` (`LoginState` ganó `attempt`) para que la selección se vea marcada otra vez.
>
> La app **prohíbe volver a las contraseñas de fábrica**, también desde la interfaz. Por eso la prueba restaura el valor original por el Admin API y no por el formulario. Las contraseñas reales no se guardan en este repositorio; la de dirección se rotó el 26-oct-2026.
>
> No se revocan las sesiones abiertas al cambiar una contraseña: el Admin API de GoTrue no expone un cierre por usuario. Las sesiones existentes siguen hasta que caduquen.
>
> La clave secreta: en local hubo primero un token de Vercel (`vck_…`) y luego una `sb_secret_…` caducada, ambas con `401 Invalid API key`. La **clave válida** (la que ya estaba en Vercel) se sincronizó a `.env.local`; con ella el bloqueo y el cambio de contraseñas funcionan. Comando de comprobación en `MEMORY.md`.

**Desplegado** (auto-deploy de Vercel, commits `69d72fa` y `4c245bf`, producción `realmun-m4penhu0w`): `/` 200, `/login` 200, `/direccion` 200 con `noindex`, `/vista-tv/comite-1` 200, `/api/tv/comite-1` 200; `/comite/comite-1`, `/panel` y `/panel/comites` con 307 a `/login?next=…` sin sesión. Las fases `lock` (12/12), `unlock` (2/2) y `password` (11/11) y las cinco suites de regresión pasan también contra `https://realmun.vercel.app`, con 0 errores de JavaScript. En producción se comprobó además que `/login` sirve solo los 4 radios de comité. La base quedó limpia: 0 asistencias, 32 delegados, 0 sanciones, 4 sesiones y 0 intentos de acceso.

### Etapa 9 — Logos del modelo extraídos del PDF y del SVG (completada, sin migraciones)

La dirección entregó dos archivos: `LOGOS MUN.pdf` (14 páginas de Canva) y `MUN_Logo.svg`. Ambos traen la marca **rasterizada**, no vectores: se extrajo cada figura a PNG con transparencia y se dejó un comando para repetirlo.

**`scripts/extract-logos.mjs`** (sin dependencias, solo Node) hace el trabajo:

- **PDF**: cada logo es un XObject de imagen con su `/SMask`. Se decodifica el flujo (`FlateDecode`), el color (escala de grises o RGB con perfil `/ICCBased`, `N` canales) y la máscara; se recorta al rectángulo de la silueta y se escribe el PNG.
- **SVG**: no hay vectores útiles; cada logo son **dos PNG incrustados en base64** (color + máscara en grises) del mismo tamaño. Se decodifican (se recorren los chunks y se infla la concatenación de los `IDAT`, con los filtros 0–4) y se emparejan por dimensiones.
- **Deduplicado perceptual**: antes de resumir el contenido se cuantiza el color (4 bits por canal) y el alfa (3 bits), para que dos renderizados del mismo logo con distinto antialias no cuenten como dos (Canva repite cada logo en varias páginas con ruido de ±2 por canal). **Nombres legibles**: `forma-tinta[-sobre-fondo]-origen-anchoxalto.png` («wordmark-rojo-pdf-1132x926», «insignia-blanco-sobre-rojo-pdf-840x840»). El nombre se calcula del propio mapa de píxeles: forma por proporción (insignia < 1.15 ≤ wordmark), fondo del anillo exterior y tinta del centro. Nada de índices.
- Escribe además **`logos.json`** (manifiesto) que la galería lee.

**`npm run logos`** regenera todo de una vez: limpia `public/logos/`, corre el script sobre el PDF y sobre el SVG y copia la galería. Hoy produce **11 logos únicos** (9 del PDF, 2 del SVG; el PDF traía 15 repeticiones).

| Variante | Qué es |
| --- | --- |
| `wordmark-rojo/…/blanco/negro/verde-pdf-1132x926` | logotipo apaisado, con transparencia |
| `wordmark-blanco-sobre-negro-pdf-1200x976` | logotipo a sangre sobre negro |
| `insignia-rojo-sobre-blanco-pdf-700x700` | insignia cuadrada, rojo sobre blanco |
| `insignia-blanco-sobre-rojo-pdf-840x840` | insignia cuadrada, blanco sobre rojo |
| `insignia-blanco-sobre-negro-pdf-1120x1120` | insignia cuadrada, blanco sobre negro |
| `insignia-negro-sobre-blanco-pdf-1120x1120` | insignia cuadrada, negro sobre blanco |
| `insignia-rojo-y-blanco-svg-1999x1971` | insignia cuadrada a alta resolución (del SVG) |
| `wordmark-rojo-svg-1132x926` | logotipo del SVG, con bordes más limpios |

Notas de la extracción:

- El SVG **no es la fuente buena** por ser vectorial (no lo es), pero sí trae la **insignia cuadrada a 1999×1971** (~1.7× la resolución del PDF) y una versión del logotipo con el antialias más limpio.
- El PDF usa `/SMask` para la forma; **no** se sigue la geometría del flujo de contenido de Canva a propósito: sus recortes anidados y matrices por capa dan recuadros equivocados. La máscara ya es la silueta exacta.
- La primera versión del script leía mal el color porque calculaba el paso de fila como `ancho × canales ÷ 8` (en bytes *por fila* es `ancho × canales`, sin dividir). Se corrigió y se verificó píxel a píxel: **42 222 muestras, 0 discrepancias** contra el `obj 30` (color) y el `obj 144` (máscara) del PDF.
- El deduplicado por bytes dejaba pasar un **falso duplicado** (el mismo logotipo rojo en dos páginas, con 18 % de píxeles distintos pero **0 perceptibles**). Se cambió a deduplicado perceptual y los 11 logos quedan distintos de verdad.

**Galería**: `public/logos/galeria.html` (fuente en `scripts/logos-galeria.html`) muestra cada logo sobre fondo claro y oscuro para juzgar contraste y transparencia. Lee `logos.json`, así que nunca lista un archivo que ya no existe. Se abre en `http://localhost:3000/logos/galeria.html`.

Verificación (Chrome real, `puppeteer-core`, suite `logos.mjs`):

| Comprobación | Resultado |
| --- | --- |
| `logos.json` responde y lista los 11 logos | OK |
| Los 11 PNG se sirven como `image/png` | OK |
| La galería pinta una tarjeta por logo | OK (11) |
| Las 22 imágenes (claro + oscuro) decodifican | OK |
| Hay 5 wordmarks con transparencia | OK |
| Sin errores de JavaScript | OK |

`tsc --noEmit`, `eslint --max-warnings=0` y `npm run build` quedan limpios, y las cinco suites de regresión (`regress`, `panel`, `direccion`, `audit-ids`, `verify-ui`) siguen pasando.

> Los archivos de origen (`LOGOS MUN.pdf`, `MUN_Logo.svg`) quedan en la raíz del repo como fuente de verdad para regenerar; `public/logos/` es todo producto derivado.

### Etapa 10 — Reglas de disciplina y rúbrica del presidente (completada)

**Migración `0013_sanciones_reglas_y_votaciones.sql`** (aplicada al remoto):

- `sanctions.points` y `sanctions.automatic`, con backfill de las sanciones existentes.
- `sanction_points(type)` (3/5/10) y `register_sanction(...)`: inserta la sanción y aplica el escalamiento **en una sola transacción**. Es `security invoker`, así que el RLS del comité y de dirección sigue mandando; valida que el delegado y la sesión pertenezcan al comité.
- Reglas: **3 advertencias → 1 amonestación automática**; **2 amonestaciones → `expulsion_mun` automática y delegado inactivo**. El historial conserva las advertencias y la amonestación automática; los puntos de todas las filas cuentan.
- Políticas de `resolution_groups` y `resolution_votes` (antes tenían RLS activo y **cero políticas**) por comité y por dirección. `0014_fix_resolution_votes_policy.sql` corrige la comparación de comité en los votos: una alianza de otro comité se rechaza con 403.
- `mun_awards()` deja de ser ejecutable por `anon`.

**Consola de sanciones**:

- Formulario con los 6 tipos (antes la acción solo aceptaba 3), puntos por tipo, resumen acumulado por delegado (advertencias /3, amonestaciones /2, expulsiones, puntos y estado) y distintivo «automática».
- Atajo **«Sanción rápida: celular / iPad»** que registra una amonestación con motivo fijo.
- El historial usa todos los delegados (también los expulsados), no solo los activos.

**Rúbrica del presidente**:

- `src/components/RubricEditor.tsx` concentra la interfaz que antes vivía en la página del comité.
- Nueva página **`/panel/rubrica`**: selector de comité y sesión, misma rúbrica y mismos criterios configurables; revalida consola, TV, `/panel` y `/panel/rubrica`.
- Pestaña «Rúbrica» en `PanelNav` y enlaces desde las tarjetas de `/panel` y `/panel/comites`.

**Limpieza y seguridad**:

- `src/lib/data.ts` vuelve al selector tipado de comités (el fallback sin `rubric_criteria` rompía `tsc`).
- `votaciones/page.tsx` deja de usar `any`; se retiran imports sin uso.
- `LOGIN_HASH_SALT` se configuró en `.env.local` y en Vercel (Production, Preview y Development).
- La contraseña por defecto de dirección se rotó; ya no aparece en `MEMORY.md`. Las contraseñas de comité también estaban rotadas.

Verificación:

| Comprobación | Resultado |
| --- | --- |
| `npx next typegen`, `tsc --noEmit`, `eslint --max-warnings=0`, `npm run build` | limpios |
| RPC con 3 advertencias | 3 advertencias + 1 amonestación automática (14 pts) |
| RPC con 6 advertencias | 2 amonestaciones automáticas + `expulsion_mun`; delegado inactivo (38 pts) |
| UI `/panel/rubrica`: guardar evaluación de un delegado temporal | fila creada en `rubric_scores` |
| UI consola: 3 advertencias | resumen 3/3, 1/2 y amonestación automática en el historial |
| `/panel`, `/panel/rubrica`, `/panel/comites`, sanciones y votaciones con Chrome real | sin errores de JavaScript |
| Limpieza de los datos de prueba | 0 sanciones, 0 delegados de prueba; la rúbrica preexistente quedó intacta |

**Desplegado**: `realmun.vercel.app` se promovió a `dpl_7AXVqAZU5BVcH7LRSh5eV1ax9Zuq` (commit `6285150`). En producción: `/` 200, `/login` 200, `/direccion` 200 con `noindex`, `/vista-tv/comite-1` 200, `/api/tv/comite-1` 200; `/panel`, `/panel/rubrica`, `/panel/comites` y `/comite/comite-1` dan 307 a login sin sesión. Con Chrome real se abrió el panel, `/panel/rubrica`, sanciones y votaciones con la contraseña nueva y **0 errores de JavaScript**. Un intento fallido controlado confirmó que el hash de `login_attempts` se calcula con el mismo `LOGIN_HASH_SALT` local; la fila se borró.

> El alias `realmun.vercel.app` quedó **fijado a un despliegue** (como en etapas anteriores). Si un push a `main` no mueve el alias, hay que promover el despliegue nuevo con `vercel promote <url>`. El auto-deploy sigue creando el despliegue, pero no siempre reasigna el dominio.

### Pendientes

- Captura de pantalla revisada por una persona (el agente de esta sesión no puede ver imágenes). Capturas en `~/Desktop/RealMUN-capturas/`: `15-panel-login.png`, `12-panel-direccion.png`, `13-panel-direccion-900.png`, `14-panel-direccion-movil.png` (panel), `16-panel-comites.png`, `17-panel-comites-movil.png`, `18-direccion-asistencia.png` (Etapa 6) y `19`–`27` (Etapa 7: portada, login, consola, panel, TV y móvil).
- Nombres reales de los comités, temas y plantilla de delegados (hoy son genéricos). Ya se pueden escribir desde `/panel/comites`.
- **Clave secreta de Supabase**: ya configurada (válida en `.env.local` y en Vercel, Production y Preview). Si alguna vez se rota, hay que actualizar los dos sitios; el comando de comprobación está en `MEMORY.md`.
- Las contraseñas por defecto ya se rotaron (comités y dirección); la de dirección se cambia desde el dashboard de Supabase o por el Admin API.
- El repositorio de GitHub sigue siendo **público**. Ya no contiene contraseñas, pero conviene ponerlo privado o revisar qué se publica en `MEMORY.md`/`AGENTS.md`.
- Login: el límite propio y el `/direccion` ya están; faltan los límites de Supabase Auth más estrictos (Authentication → Rate Limits), el captcha (Turnstile) y MFA para la dirección.
- El enlace a `/direccion` vive en el pie de `/login`; si se quiere todavía más discreto, basta con quitarlo (la dirección conoce la URL).
- Al cambiar una contraseña no se cierran las sesiones abiertas de ese comité (el Admin API no tiene cierre por usuario).
- Si se quiere más de una cuenta de dirección, repetir el alta y poner `role = 'direccion'`.
- El directorio local `supabase/migrations/` no tiene las migraciones 0002–0005 (se aplicaron al remoto con otros nombres desde etapas anteriores). La base remota es la fuente de verdad; si se rehace el proyecto desde cero, hay que reconstruir 0002–0005 o volcar el esquema.
