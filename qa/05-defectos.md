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

**Estado del informe.** Seis defectos confirmados (`BUG-01` … `BUG-06`), uno por cada encabezado
`### BUG-` de este documento: tres de API (`BUG-01`, `BUG-03`, `BUG-04`) y tres de UI (`BUG-02`,
`BUG-05`, `BUG-06`). Los seis se reprodujeron sobre `15765d9` y ninguno se cuenta sin reproducción;
los candidatos que no se pudieron confirmar quedan separados en la sección final «Hipótesis y
divergencias no promovidas» y no se citan como bloqueadores.

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
  nunca `Page`; y `backend/internal/httpx/paging.go:48` calcula `start = min((page-1)*size, len)`, que con `page = -1` es
  `-20`, produciendo el corte `items[-20:-10]` y el pánico. `httpx.Recover`
  (`backend/internal/httpx/middleware.go:48-53`) lo convierte en `500`.
- **Detección automática**: tests unitarios propuestos #1 y #2 en `qa/04-caja-blanca.md`
  (`Paginate` no debe entrar en pánico con `page: -1`; `Normalize` debe rechazar `page: -1`), más la
  pierna de API opcional del suite E2E.

### BUG-02 · La paginación del libro de medidores no tiene página 2

- **Severidad**: `S2` — con 12 medidores y páginas de 10, el operador no puede ver M-111 ni M-112
  desde el libro de medidores: dos medidores quedan fuera de la pantalla que existe para listarlos.
  No hay pérdida de datos (la búsqueda directa los encuentra), pero la pantalla principal de consulta
  oculta el 17 % del parque.
- **Prioridad**: `P1` — la urgencia es inmediata: el defecto bloquea el acceso ordinario a dos
  medidores y su corrección es un cambio de una línea (`Math.floor` → `Math.ceil`). Impacto alto con
  coste mínimo.
- **Entorno**: Chromium 156.0.8078.4 (Playwright) · macOS 26.5 · TZ America/Bogota · commit `15765d9`.
- **Precondición**: sesión iniciada con la cuenta demo; sin filtros aplicados.
- **Pasos**:
  1. Abrir `http://localhost:3000/medidores`.
  2. Leer el texto de rango y el estado del botón `Siguiente`.
  3. Intentar llegar a `M-111` o `M-112` con los controles de paginación.
- **Datos usados**: 12 medidores, `PAGE_SIZE = 10`.
- **Esperado**: dos páginas con `Siguiente` habilitado en la primera, rango `1–10 de 12 medidores` y
  acceso a `11–12 de 12`. Oráculo: `backend/README.md:80` (la lista "sin body devuelve la página 1 de
  10" sobre 12 medidores documentados en `backend/README.md:24`), el texto que la propia UI imprime
  (`1–10 de 12 medidores`) y el estándar de la industria: el número de páginas de una lista paginada
  es `ceil(total / tamaño)`, no `floor`.
- **Obtenido**: 10 filas (`M-101`…`M-110`), rango literal `1–10 de 12 medidores`, `Anterior`
  deshabilitado y **`Siguiente` deshabilitado**. `M-111` y `M-112` no aparecen en ninguna página;
  buscar `M-112` en el campo `Medidor` sí devuelve `1–1 de 1 medidores`, lo que prueba que el dato
  existe y sólo la paginación lo oculta.
- **Evidencia**: `qa/evidencias/BUG-02_paginacion-sin-pagina-2.png` (`1–10 de 12 medidores` con
  `Siguiente` deshabilitado) · `qa/02-smoke.md` SM-05.
- **Causa raíz probable**: `frontend/src/features/meters/components/Pagination.tsx:13` —
  `const pages = Math.max(1, Math.floor(count / size))` calcula `floor(12 / 10) = 1` página, así que
  `page >= pages` deshabilita `Siguiente` desde la primera página. La operación correcta es
  `Math.ceil`.
- **Detección automática**: E2E-01 en `e2e/tests/e2e-01-flujo-negocio.spec.ts` ya fija el contrato de
  filas por página y el acceso a M-109; se propone añadir la aserción de que `Siguiente` está
  habilitado y de que la segunda página contiene `M-111`/`M-112` cuando `count > size`.

### BUG-05 · El despacho dice "3 órdenes abiertas" y muestra cuatro tarjetas

- **Severidad**: `S3` — el contador y la lista que lo acompaña se contradicen en la misma pantalla.
  El operador ve las cuatro órdenes y no pierde ninguna acción, pero el resumen de cabecera comunica
  un estado de planta distinto del que muestra el cuerpo; el impacto es de confianza en el dato, no
  de operación.
- **Prioridad**: `P3` — es media: el defecto es visible y barato de corregir, pero no bloquea ninguna
  tarea y la información completa ya está en pantalla. No se adelanta a los defectos que ocultan
  datos o rompen la API.
- **Entorno**: Chromium 156.0.8078.4 (Playwright) · macOS 26.5 · TZ America/Bogota · commit `15765d9`.
- **Precondición**: sesión iniciada y dataset sin modificaciones.
- **Pasos**:
  1. Abrir `http://localhost:3000/`.
  2. Leer la línea de descripción de la cabecera "Despacho".
  3. Contar las tarjetas de orden renderizadas debajo.
- **Datos usados**: 4 anomalías del motor, una de ellas `FALSE_POSITIVE` con `anomaly: false`.
- **Esperado**: el contador debe coincidir con las tarjetas que describe: **4 órdenes**. Oráculo:
  `backend/README.md:15` ("4 anomalías detectadas") y su tabla de 4 filas (`:17-22`), replicada en
  `README.md:9-14`; la cuarta orden (M-106) es una orden emitida con acción "No escalar", no una
  excepción. Decisión escrita: cuando un rótulo cuantifica una lista, ambos deben coincidir
  (estándar de la industria; la documentación no define un "abierta" distinto de "emitida").
- **Obtenido**: cabecera `3 órdenes abiertas, ordenadas por prioridad.` y **cuatro** tarjetas
  renderizadas: `M-109`, `M-112`, `M-104`, `M-106` (la primera a doble escala, las otras tres
  compactas).
- **Evidencia**: `qa/evidencias/BUG-05_ordenes-abiertas-vs-tarjetas.png` (contador y cuatro tarjetas
  en la misma captura) · `qa/02-smoke.md` SM-04/SM-08.
- **Causa raíz probable**: `frontend/src/app/routes/DashboardRoute.tsx:32` —
  `summary.data.priorities.filter((p) => p.anomaly).length` cuenta sólo las órdenes con
  `anomaly: true` (3), mientras `:74-79` renderiza la orden líder y **todas** las de `rest` sobre
  `summary.data.priorities` (4). El contador y la lista usan criterios distintos.
- **Detección automática**: E2E de negocio: aserción de que el número del rótulo de cabecera es igual
  al `count()` de las tarjetas de la sección de órdenes, con el valor de negocio `4`.

### BUG-06 · La hora de planta se muestra en la zona del navegador

- **Severidad**: `S2` — la columna "Detectada" y la cabecera de la orden muestran `12/09 09:00`
  cuando la hora de planta documentada es `12/09 14:00`. Un operador que correlacione el evento con
  registros de planta se desplaza 5 horas y puede descartar la ventana correcta; el impacto es
  directo sobre el diagnóstico, no cosmético.
- **Prioridad**: `P1` — inmediata: afecta a todas las marcas de tiempo de planta de la aplicación
  (lista de anomalías, tarjetas de orden, libro y detalle) y la corrección es localizada en una sola
  función. Además es el detector E2E elegido, porque su falla produce un par esperado/recibido
  numérico que atribuye el defecto sin ambigüedad.
- **Entorno**: Chromium 156.0.8078.4 (Playwright) · macOS 26.5 · TZ America/Bogota · commit `15765d9`.
- **Precondición**: sesión iniciada; `timezoneId` del contexto = `America/Bogota`; viewport 1440×900
  (por encima del corte `lg` que muestra la columna "Detectada").
- **Pasos**:
  1. Abrir `http://localhost:3000/anomalias`.
  2. Localizar la fila de `M-109` y leer la celda "Detectada".
  3. Recargar la página y repetir la lectura para comprobar estabilidad.
- **Datos usados**: `detected_at` de M-109 = `2026-09-12T14:00:00Z` (API y `backend/README.md:28`).
- **Esperado**: `12/09 14:00`. Oráculo: `backend/README.md:28` ("desde 12/09 14:00") y el contrato
  escrito en el propio archivo del formateador: `frontend/src/lib/format.ts:51-52` declara que la
  hora de planta "se lee en partes UTC para NO convertirla a la zona del navegador".
- **Obtenido**: `12/09 09:00` — cinco horas menos — tanto en la celda "Detectada" de `/anomalias`
  como en la cabecera "Detectada" de la orden de M-109 del tablero. La lectura fue idéntica en dos
  cargas consecutivas (sin nondeterminismo de reloj o locale); las cuatro filas muestran el mismo
  desplazamiento (`12/09 09:00`, `12/09 19:00`, `10/09 19:00`, `07/09 19:00` frente a los valores
  UTC de la API).
- **Evidencia**: `qa/evidencias/BUG-06_hora-de-planta-desfasada.png` (columna "Detectada" con
  `12/09 09:00` para M-109) · `qa/02-smoke.md` SM-08 · spike de 30 minutos ejecutado antes de escribir
  el test: celda visible a 1440×900, formato `dd/mm hh:mm`, texto `12/09 09:00`, estable en dos cargas.
- **Causa raíz probable**: `frontend/src/lib/format.ts:57-58` — `formatPlantTime` usa
  `getDate()/getMonth()/getHours()/getMinutes()` (partes locales) en lugar de las partes UTC. La
  contraevidencia está en el mismo archivo: `formatPlantDate` (`:63`) sí usa
  `getUTCDate()/getUTCMonth()`, y el comentario `:51-52` documenta la intención correcta; por eso es
  un defecto y no una decisión de diseño.
- **Detección automática**: test E2E marcado `test.fail(true, 'BUG-06 · …')` en
  `e2e/tests/e2e-02-bug-06-zona-horaria.spec.ts`, con la aserción
  `toHaveText('12/09 14:00')` sobre la celda de M-109; hoy falla con `Expected "12/09 14:00" /
  Received "12/09 09:00"`.

---

## Decisión de informe: BUG-01 y BUG-03 se mantienen separados

`BUG-01` (KPI del tablero en `8/2/2`) y `BUG-03` (el filtro `Normales` oculta M-106) comparten la
misma causa raíz: `backend/internal/meter/enums.go:29-38` no tiene rama para `FALSE_POSITIVE`. Se
conservan como **dos entradas** porque el síntoma observable, la pantalla afectada y el oráculo citado
son distintos: un número agregado contra `backend/README.md:24` frente a una fila ausente contra
`backend/README.md:105`. La causa compartida está declarada en ambas entradas, de modo que un revisor
puede fusionarlas en una sola corrección sin perder información; fusionarlas en el informe habría
ocultado que el mismo error produce dos fallas verificables en pantallas diferentes.

---

## Hipótesis y divergencias no promovidas

Candidatos observados durante la ejecución que **no** se cuentan entre los seis defectos: o no se
pudieron confirmar contra un oráculo, o describen dos medidas distintas que la documentación no
obliga a igualar. Se listan con la evidencia negativa que impidió confirmarlos.

### H1 · La corriente de M-109 se reporta como `+109,9 %` y como `+105,6 %`

- **Qué se intentó**: verificar el valor de corriente que cita `backend/README.md:333` («la corriente
  subió de 195,9 a 411,1 A (+109,9 %)») contra las dos superficies que la muestran.
- **Qué se observó (evidencia negativa)**: `GET /meter/getById/M-109` devuelve
  `electrical.current_a = {value: 402.78, baseline: 195.88, change_pct: 105.63}`, mientras la
  evidencia de `GET /anomaly/getAll` para el mismo medidor devuelve
  `current_a.change_pct = 109.858` sobre `observed: 411.07`. La UI del detalle muestra `+105,6 %`.
- **Por qué no se confirma**: cada superficie compara una referencia distinta —la última lectura
  (402,78 A) frente al valor representativo de la ventana (411,07 A)—. Ningún documento define cuál
  de las dos debe ver el operador, así que no hay oráculo que se incumpla. Queda como observación de
  coherencia de producto, no como defecto.

### H2 · La variación de M-104 aparece como `+46,5 %` en el texto y `+47,3 %` en el libro

- **Qué se intentó**: comparar el texto que genera el motor para la orden de M-104 con la columna
  *Variación* del libro de medidores.
- **Qué se observó (evidencia negativa)**: el texto de la orden dice «Consumo +46,5%» y corresponde a
  `evidence.change.change_pct = 46.517` (ventana sostenida); el libro muestra `+47,3 %` y corresponde
  a `variation_pct = 47.27` (24 h contra baseline). Ambos valores salen de la misma respuesta de la API.
- **Por qué no se confirma**: son dos medidas diferentes y ambas están documentadas
  (`backend/README.md:110` define la variación del libro; `:319-325` describe el cambio sostenido). No
  hay contradicción, sino dos ventanas distintas.

### H3 · El total de paginación se calcula sobre la página (descartada)

- **Qué se intentó**: comprobar si `count` reflejaba sólo las filas de la página en curso.
- **Qué se observó (evidencia negativa)**: CN-06 pide `page: 99` y la respuesta es
  `{"page":99,"size":10,"count":12,"rows":[]}`; `E2E-03` pide la página 2 y también recibe
  `count: 12` con dos filas. El total es del conjunto completo (`backend/internal/httpx/paging.go:53`).
- **Por qué no se confirma**: la hipótesis es falsa; se conserva aquí porque estaba en el tablero de
  pendientes y su descarte es parte del resultado.

### Divergencia confirmada fuera del registro · la búsqueda distingue mayúsculas

- **Qué se observó**: `CN-07` busca `m-109` en el libro y obtiene 0 filas («Ningún medidor coincide
  con los filtros»); la misma consulta a la API (`filter.meter_id: "m-109"`) responde `count: 0`.
  El contrato publicado promete lo contrario: Swagger `/docs/openapi.json` documenta «Coincidencia
  parcial y sin importar mayúsculas» y `backend/internal/meter/dto.go:27-30` lo repite.
- **Por qué no se promovió a defecto**: el registro de defectos se cerró con seis casos reproducidos
  antes de la fase de casos y este documento no se reabre en esta entrega. La divergencia queda
  registrada en `qa/03-casos-caja-negra.md` (CN-07, `FALLA`) y en `qa/01-plan-de-pruebas.md` como
  riesgo residual de R5, con la corrección sugerida: normalizar `filter.meter_id` en
  `backend/internal/meter/dto.go:44` y comparar en mayúsculas en
  `backend/internal/meter/service.go:59`.
