# Defectos · EnergIA

**Alcance.** Defectos confirmados por reproducción directa sobre la línea base congelada
`15765d9`, con evidencia en `qa/evidencias/`. Cada entrada contiene los once campos obligatorios:
identificación, severidad, prioridad, entorno, precondición, pasos, datos, esperado con oráculo,
obtenido, evidencia y causa raíz probable, más la propuesta de detección automática.

**Convenciones.** Severidad (`S1` bloqueante … `S4` cosmético) mide impacto en usuario o negocio;
prioridad (`P1` inmediata … `P4` baja) mide urgencia de corrección. Son ejes independientes y, cuando
divergen, la divergencia se explica en una línea. Ningún defecto se declara sin reproducción real.

**Entorno común.** macOS 26.5 (arm64) · `TZ America/Bogota` · commit `15765d9` · API directa en
`http://localhost:8080` y UI en `http://localhost:3000`.

**Estado del informe.** Tres defectos confirmados en este documento (`BUG-01`, `BUG-03`, `BUG-04`).
Los hallazgos de UI y zona horaria se agregan en la misma revisión; los candidatos no reproducidos se
separan en la sección de hipótesis.

---

### BUG-01 · El tablero cuenta como alerta un falso positivo

- **Severidad**: `S2` — el KPI de cabecera muestra `8 normales · 2 alerta · 2 críticas` cuando el
  estado real es `9 normales · 1 alerta · 2 críticas`. El operador recibe un diagnóstico de planta
  incorrecto en la primera pantalla, aunque no pierde acceso a ningún medidor ni a la lista de
  prioridades; el impacto es de decisión, no de disponibilidad.
- **Prioridad**: `P2` — la corrección es urgente pero no crítica: el dato erróneo alimenta la
  cabecera y el filtro `Normales`, y existe un camino alternativo correcto (la lista de anomalías sí
  muestra M-106 con su acción "No escalar").
- **Entorno**: Chromium 156.0.8078.4 (Playwright) · macOS 26.5 · TZ America/Bogota · commit `15765d9`.
- **Precondición**: stack arriba y sesión iniciada con la cuenta demo `admin@energia.local`.
- **Pasos**:
  1. Abrir `http://localhost:3000` e iniciar sesión.
  2. Leer el bloque "Estado de la planta" del tablero de despacho.
- **Datos usados**: dataset de 12 medidores y 14 días; 4 anomalías (M-109, M-112, M-104, M-106).
- **Esperado**: `status_counts = {normal: 9, alert: 1, critical: 2}`. Oráculo: `backend/README.md:24`
  ("Los otros 8 medidores no generan alertas", sobre 12 medidores con 4 anomalías) y
  `backend/README.md:105` (`FALSE_POSITIVE` → `NORMAL`); M-106 es `FALSE_POSITIVE`
  (`backend/README.md:22`).
- **Obtenido**: `status_counts = {normal: 8, alert: 2, critical: 2}` en `GET /api/v1/dashboard/getSummary`
  (`HTTP 200`) y el mismo desglose en pantalla: `8 normales · 2 alerta · 2 críticas`. El reparto
  correcto exige 9 normales porque M-106, siendo falso positivo, debe contarse como normal.
- **Evidencia**: `qa/evidencias/api/BUG-01_status-counts.md` ·
  `qa/evidencias/BUG-01_status-counts-dashboard.png` · reproducible con
  `bash qa/evidencias/run.sh BUG-01` (sale con código 1 mientras el defecto exista).
- **Causa raíz probable**: `backend/internal/meter/enums.go:29-38` — `StatusOf` no tiene rama para
  `TypeFalsePositive`, así que M-106 (severidad `LOW`) cae en `default: StatusAlert`. El comentario
  del propio archivo (`:26`) documenta el comportamiento que el `switch` no implementa. Es la **misma
  causa raíz** que BUG-03: una rama ausente produce ambos síntomas.
- **Detección automática**: test unitario propuesto #3 en `qa/04-caja-blanca.md`
  (`StatusOf(&Anomaly{Type: FALSE_POSITIVE, Severity: LOW}) == StatusNormal`), que hoy falla.

### BUG-03 · El filtro "Normales" esconde el falso positivo M-106

- **Severidad**: `S3` — el medidor M-106 sigue visible en el libro de medidores y en la lista de
  anomalías con su acción "No escalar"; sólo desaparece de una pestaña de filtro. El impacto en el
  usuario es menor: no oculta el caso, lo hace inconsistente entre pantallas.
- **Prioridad**: `P2` — la urgencia es alta pese al impacto menor: la corrección es la misma rama de
  código que BUG-01 (`enums.go`), y mientras no se corrija el filtro contradice al KPI y a la
  documentación. La divergencia `S3`/`P2` se debe a que el arreglo es barato y compartido, no a que el
  síntoma sea grave.
- **Entorno**: Chromium 156.0.8078.4 (Playwright) · macOS 26.5 · TZ America/Bogota · commit `15765d9`.
- **Precondición**: sesión iniciada con la cuenta demo y dataset sin modificaciones.
- **Pasos**:
  1. Abrir `http://localhost:3000/medidores`.
  2. Seleccionar la pestaña de estado `Normales`.
  3. Leer el rango de paginación y buscar `M-106` en la tabla.
- **Datos usados**: filtro `status = NORMAL` sobre los 12 medidores.
- **Esperado**: `200` con `count: 9` e inclusión de M-106, y su fila visible en la pestaña `Normales`.
  Oráculo: `backend/README.md:105` ("Sin anomalía, o `FALSE_POSITIVE` | `NORMAL`").
- **Obtenido**: `200` con `count: 8`; filas `M-101, M-102, M-103, M-105, M-107, M-108, M-110, M-111`
  y **M-106 ausente**. En pantalla, `1–8 de 8 medidores` con la pestaña `Normales` activa.
- **Evidencia**: `qa/evidencias/api/BUG-03_falso-positivo-fuera-de-normales.md` ·
  `qa/evidencias/BUG-03_falso-positivo-fuera-de-normales.png` · reproducible con
  `bash qa/evidencias/run.sh BUG-03` (sale con código 1 mientras el defecto exista).
- **Causa raíz probable**: `backend/internal/meter/enums.go:29-38` — la misma rama ausente de
  `StatusOf` que en BUG-01: M-106 queda como `ALERT` y el filtro `NORMAL` construye su partición sin
  él. Se mantiene como entrada separada porque el síntoma (fila ausente), la pantalla (filtro del
  libro) y el oráculo (`:105`, no `:24`) son distintos; un revisor puede fusionarlas sin perder
  información.
- **Detección automática**: test unitario propuesto #3 en `qa/04-caja-blanca.md`
  (`StatusOf(FALSE_POSITIVE) == StatusNormal`), más el test E2E del filtro que se entrega en `e2e/`.

### BUG-04 · `page: -1` produce un 500 en lugar de un 400

- **Severidad**: `S2` — una entrada inválida enviada por cualquier cliente autenticado provoca un
  error interno del servidor y el operador no obtiene datos. No hay pérdida ni corrupción de datos,
  pero el fallo es evitable y llega al usuario como "Error interno", que no explica nada.
- **Prioridad**: `P1` — es inmediata: se alcanza con un único parámetro trivial en el cuerpo de una
  petición válida, la validación hermana (`size`) ya existe y el arreglo es de pocas líneas en la
  misma función. Riesgo alto con coste bajo.
- **Entorno**: curl 8.7.1 · macOS 26.5 · API directa `http://localhost:8080` · commit `15765d9`.
- **Precondición**: token válido de la cuenta demo (la ruta exige autenticación).
- **Pasos**:
  1. Obtener el token con `POST /api/v1/auth/login`.
  2. Enviar `POST /api/v1/meter/getAll` con `{"pagination":{"page":-1,"size":10}}`.
  3. Observar el estado y el cuerpo de la respuesta.
- **Datos usados**: `pagination.page = -1`, `pagination.size = 10`.
- **Esperado**: `400` con `errors[]` de validación. Oráculo: `backend/internal/httpx/paging.go:18`
  declara `minimum:"1"` para `page`, Swagger publica ese contrato, y `backend/internal/httpx/paging.go:32`
  demuestra que el patrón de validación ya se aplica a `size`; la regla de entrada negativa exige
  `400`, nunca `500`.
- **Obtenido**: `HTTP/1.1 500 Internal Server Error` con
  `{"status_code":500,"message":"Error interno del servidor",...}`.
- **Evidencia**: `qa/evidencias/api/BUG-04_page-negativo-500.md` · reproducible con
  `bash qa/evidencias/run.sh BUG-04`, que termina con código **1** e imprime la línea de estado `500`.
- **Causa raíz probable**: `backend/internal/httpx/paging.go:23-36` — `Normalize` sólo valida `Size`,
  nunca `Page`; y `paging.go:48` calcula `start = min((page-1)*size, len)`, que con `page = -1` es
  `-20`, produciendo el corte `items[-20:-10]` y el pánico. `httpx.Recover`
  (`backend/internal/httpx/middleware.go:48-53`) lo convierte en `500`.
- **Detección automática**: tests unitarios propuestos #1 y #2 en `qa/04-caja-blanca.md`
  (`Paginate` no debe entrar en pánico con `page: -1`; `Normalize` debe rechazar `page: -1`), más la
  pierna de API opcional del suite E2E.
