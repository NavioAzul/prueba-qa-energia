# Casos de prueba de caja negra · EnergIA

**Alcance**: 18 casos ejecutados contra la aplicación en `http://localhost:3000` (UI, tras nginx) y
`http://localhost:8080` (API cruda, sin proxy). Cada caso cubre exactamente una técnica de caja negra
y registra el valor observado en esta ejecución; no hay casos planificados sin ejecutar.

**Línea base**: aplicación en el SHA congelado `15765d9` (ver `qa/evidencias/README.md`), navegador
Chromium 156.0.8078.4 con `TZ America/Bogota`, viewport 1440×900, cuenta demo `admin@energia.local`.

**Técnicas permitidas**: partición de equivalencia · valores límite · tabla de decisión · transición
de estado · negativa · consistencia entre capas. Cada `**Técnica**` declara una sola.

> `AGENTS.md` lista cinco técnicas y ninguna cubre un ciclo de vida asíncrono, así que **`transición
> de estado` se agrega como sexta** porque el requisito CN-3 la exige para el ciclo de *Run AI
> Analysis*. Es la única extensión del vocabulario en este documento.

**Reparto por capa**: 10 casos `API` (CN-02…CN-06, CN-08, CN-09, CN-10, CN-12, CN-13) y 8 `UI`
(CN-01, CN-07, CN-11, CN-14, CN-15, CN-16, CN-17, CN-18). **Resultado**: 14 `PASA`, 4 `FALLA`.

---

## G1 · Autenticación y validación negativa

### CN-01 · Una contraseña incorrecta muestra el error y no abre sesión

- **Capa**: UI
- **Técnica**: partición de equivalencia
- **Precondición**: sesión cerrada; `/login` accesible.
- **Pasos**: 1. Abrir `/login`. 2. Escribir `admin@energia.local` y la contraseña `clave-incorrecta`. 3. Pulsar *Entrar*.
- **Datos**: email válido + contraseña fuera de la clase válida; la única credencial documentada es `admin@energia.local` / `admin123` (`README.md:47`).
- **Esperado**: la pantalla sigue en `/login` y muestra un mensaje de error accesible por `role="alert"` (oráculo: `frontend/DESIGN.md:206`, que exige mensaje de error asociado al campo).
- **Obtenido**: URL `http://localhost:3000/login` (sin navegación); `role="alert"` con el texto «Email o contraseña incorrectos. Revisa los datos e inténtalo de nuevo.»
- **Estado**: PASA

### CN-02 · Sin cabecera `Authorization` la API responde 401

- **Capa**: API
- **Técnica**: negativa
- **Precondición**: ninguna; el endpoint exige sesión (`backend/internal/server/server.go:41`).
- **Pasos**: 1. `POST /api/v1/meter/getAll` con body paginado válido. 2. Omitir `Authorization`.
- **Datos**: `{"pagination":{"page":1,"size":10}}`.
- **Esperado**: `401` con mensaje de token faltante (oráculo: Swagger `/docs/openapi.json`, que declara `401` en `POST /meter/getAll`).
- **Obtenido**: `HTTP/1.1 401 Unauthorized` · `{"status_code":401,"message":"Falta el token de autenticación","path":"/api/v1/meter/getAll"}`. Evidencia: `qa/evidencias/api/CN-02_sin-token.md`.
- **Estado**: PASA

### CN-03 · Un bearer con formato inválido responde 401

- **Capa**: API
- **Técnica**: negativa
- **Precondición**: ninguna.
- **Pasos**: 1. `POST /api/v1/meter/getAll` con `Authorization: Bearer no-es-un-jwt`. 2. Leer estado y mensaje.
- **Datos**: token sintácticamente inválido (no es un JWT).
- **Esperado**: `401` con mensaje de token inválido, distinto del caso «token ausente» (`backend/README.md:113-120`, formato único de error).
- **Obtenido**: `HTTP/1.1 401 Unauthorized` · `{"status_code":401,"message":"Token inválido o expirado","path":"/api/v1/meter/getAll"}`.
- **Estado**: PASA

## G2 · Límites de paginación y búsqueda

### CN-04 · `size: 101` es rechazado con 400 y `errors[]`

- **Capa**: API
- **Técnica**: valores límite
- **Precondición**: sesión válida.
- **Pasos**: 1. `POST /api/v1/meter/getAll` con `pagination.size = 101`. 2. Leer estado y arreglo de errores.
- **Datos**: `{"pagination":{"page":1,"size":101}}`; el máximo declarado es 100 (`backend/internal/httpx/paging.go:19`).
- **Esperado**: `400` con `errors[]` no vacío que nombra el rango 1–100 (oráculo: Swagger `Pagination.size` con `maximum: 100` y el contrato de errores de `backend/README.md:113-120`).
- **Obtenido**: `HTTP/1.1 400 Bad Request` · `{"status_code":400,"message":"Filtros inválidos","errors":["pagination.size debe estar entre 1 y 100"]}`. Evidencia: `qa/evidencias/api/CN-04_pageSize-101.md`.
- **Estado**: PASA

### CN-05 · `page: -1` devuelve 500 en vez de 400

- **Capa**: API
- **Técnica**: valores límite
- **Precondición**: sesión válida.
- **Pasos**: 1. `POST /api/v1/meter/getAll` con `pagination.page = -1`. 2. Leer estado y cuerpo.
- **Datos**: `{"pagination":{"page":-1,"size":10}}`; el mínimo declarado es 1 (`backend/internal/httpx/paging.go:18`).
- **Esperado**: `400` con `errors[]`, como cualquier entrada negativa fuera de rango (oráculo: Swagger `Pagination.page` con `minimum: 1` y la regla de entrada negativa de `AGENTS.md`).
- **Obtenido**: `HTTP/1.1 500 Internal Server Error` · `{"status_code":500,"message":"Error interno del servidor","path":"/api/v1/meter/getAll"}`. `bash qa/evidencias/run.sh BUG-04` sale con código 1. Evidencia: `qa/evidencias/api/BUG-04_page-negativo-500.md`.
- **Estado**: FALLA → **BUG-04** (el pánico se produce en `backend/internal/httpx/paging.go:48` porque `Normalize` no valida `Page`).

### CN-06 · Una página posterior a la última devuelve 200 con lista vacía

- **Capa**: API
- **Técnica**: valores límite
- **Precondición**: sesión válida; 12 medidores en el dataset.
- **Pasos**: 1. `POST /api/v1/meter/getAll` con `pagination.page = 99`. 2. Leer `count` y `rows`.
- **Datos**: `{"pagination":{"page":99,"size":10}}`.
- **Esperado**: `200`, `count` igual al total sin paginar (12) y `rows` vacío, no nulo (oráculo: `backend/internal/httpx/paging.go:42` documenta `count` como «total de resultados, sin paginar» y `:54` documenta `[]` en vez de `null`).
- **Obtenido**: `200` · `{"page":99,"size":10,"count":12,"rows":[]}` (`rows` es `[]`, no `null`).
- **Estado**: PASA

### CN-07 · La búsqueda escrita en minúsculas no encuentra el medidor

- **Capa**: UI
- **Técnica**: partición de equivalencia
- **Precondición**: sesión iniciada; `/medidores` con los 12 medidores.
- **Pasos**: 1. Escribir `m-109` en el campo *Medidor*. 2. Pulsar *Buscar medidor*. 3. Leer el resultado.
- **Datos**: término `m-109` (misma cadena que el ID, en minúsculas). Clases de entrada del campo: exacta, parcial, en minúsculas, inexistente.
- **Esperado**: 1 fila, M-109: la búsqueda es parcial y **sin distinguir mayúsculas** (oráculo: Swagger `/docs/openapi.json`, `Filter.meter_id` → «Coincidencia parcial y sin importar mayúsculas: "109" encuentra M-109»; el mismo contrato está en `backend/internal/meter/dto.go:27-30`).
- **Obtenido**: 0 filas con URL `?medidor=m-109`; la tabla muestra «Ningún medidor coincide con los filtros · No hay medidores que contengan "m-109"». La misma consulta contra la API (`filter.meter_id: "m-109"`) responde `200` con `count: 0`.
- **Estado**: FALLA → divergencia **no promovida a defecto** en esta entrega: `backend/internal/meter/service.go:59` usa `strings.Contains` sobre el ID sin normalizar, mientras el contrato publicado promete insensibilidad a mayúsculas. Se registra aquí y en el riesgo residual de `qa/01-plan-de-pruebas.md`; el registro `qa/05-defectos.md` se mantiene con los seis defectos reproducidos en la ejecución anterior.

### CN-08 · La búsqueda parcial encuentra el medidor

- **Capa**: API
- **Técnica**: partición de equivalencia
- **Precondición**: sesión válida.
- **Pasos**: 1. `POST /api/v1/meter/getAll` con `filter.meter_id = "109"`. 2. Leer `count` y los IDs devueltos.
- **Datos**: `{"pagination":{"page":1,"size":10},"filter":{"meter_id":"109"}}`.
- **Esperado**: una sola fila, M-109 (oráculo: Swagger `Filter.meter_id`, que documenta la coincidencia parcial con el ejemplo «109»).
- **Obtenido**: `200` · `{"count":1,"ids":["M-109"]}`.
- **Estado**: PASA

## G3 · Motor de anomalías: tabla de decisión

Condiciones: **tipo** → **severidad** → **confianza** → **prioridad** → **acción**. Los valores
esperados salen de `backend/README.md:17-22`; los obtenidos, de `GET /api/v1/anomaly/getAll` y de la
columna *Acción* de `/anomalias` en la misma ejecución.

| Medidor | Tipo | Severidad | Confianza | Anomaly | Prioridad | Estado derivado | Acción esperada (oráculo) | Acción obtenida | Estado |
|---|---|---|---|---|---|---|---|---|---|
| M-109 | REAL_ANOMALY | HIGH | 0,95 | true | 1 | CRITICAL → «Crítica» | Investigar en sitio | «Investigar» (API: «Investigar en sitio la instalación de M-109…») | PASA |
| M-112 | DATA_QUALITY | HIGH | 0,95 | true | 2 | CRITICAL → «Crítica» | Validar el medidor | «Validar medidor» | PASA |
| M-104 | EXPLAINABLE_ANOMALY | MEDIUM | 0,86 | true | 3 | ALERT → «Alerta» | Validar con operación y actualizar baseline | «Validar operación» | PASA |
| M-106 | FALSE_POSITIVE | LOW | 0,86 | false | 4 | NORMAL → «Normal» | No escalar | «No escalar», pero estado «Alerta» | **FALLA** |
| M-109 vs M-112 (par combinatorio) | REAL_ANOMALY = severidad, ≠ impacto | HIGH = HIGH | 0,95 = 0,95 | true = true | 1 vs 2 | CRITICAL vs CRITICAL | 1 antes que 2 por energía en juego (2.824,95 kWh vs 0 kWh) | prioridad 1 y 2 en ese orden | PASA |

La fila de M-106 conserva su divergencia: se deja en la tabla porque esconderla haría parecer
consistente una regla que el producto no cumple.

### CN-09 · Los cuatro tipos documentados aparecen con su severidad y confianza

- **Capa**: API
- **Técnica**: tabla de decisión
- **Precondición**: sesión válida; motor ejecutado al arrancar la API.
- **Pasos**: 1. `GET /api/v1/anomaly/getAll`. 2. Comparar fila a fila con la tabla de `backend/README.md:17-22`.
- **Datos**: las cuatro filas esperadas: M-109, M-112, M-104, M-106.
- **Esperado**: cuatro anomalías con tipo, severidad y confianza 0,95 / 0,95 / 0,86 / 0,86 (oráculo: `backend/README.md:15-22` y `PRUEBA_QA.md:45`, que exige cubrir los cuatro tipos).
- **Obtenido**: cuatro filas: `M-109 REAL_ANOMALY HIGH 0.95`, `M-112 DATA_QUALITY HIGH 0.95`, `M-104 EXPLAINABLE_ANOMALY MEDIUM 0.86`, `M-106 FALSE_POSITIVE LOW 0.86`. Cada fila trae `recommended_action` redactada y `evidence.impact_kwh`.
- **Estado**: PASA

### CN-10 · Misma severidad, distinto impacto: M-109 antes que M-112

- **Capa**: API
- **Técnica**: tabla de decisión
- **Precondición**: sesión válida.
- **Pasos**: 1. `GET /api/v1/anomaly/getAll`. 2. Comparar `priority` y `evidence.impact_kwh` de M-109 con los de M-112.
- **Datos**: dos condiciones simultáneas — severidad `HIGH` idéntica y energía en juego distinta.
- **Esperado**: M-109 con prioridad 1 y M-112 con prioridad 2, porque a igual severidad decide la energía en juego (oráculo: `backend/README.md:333-337`, «M-109 (2.825 kWh de más) va antes que M-112 (0 kWh)»).
- **Obtenido**: `M-109 priority=1 impact_kwh=2824.95` y `M-112 priority=2 impact_kwh=0`; el orden de la tabla en `/anomalias` es M-109, M-112, M-104, M-106.
- **Estado**: PASA

### CN-11 · El estado que ve el operador se deriva del tipo y la severidad

- **Capa**: UI
- **Técnica**: tabla de decisión
- **Precondición**: sesión iniciada; `/medidores`.
- **Pasos**: 1. Buscar `M-104` y leer la columna *Estado*. 2. Repetir con `M-106`.
- **Datos**: M-104 (`EXPLAINABLE_ANOMALY`, `MEDIUM`) y M-106 (`FALSE_POSITIVE`, `LOW`).
- **Esperado**: M-104 → «Alerta»; M-106 → «Normal», porque un falso positivo no genera alerta (oráculo: `backend/README.md:105-110`, tabla de estado de alerta).
- **Obtenido**: M-104 → «Alerta» (correcto); M-106 → «Alerta» (incorrecto; la API coincide: `status: ALERT`). Evidencia de la vista: `qa/evidencias/BUG-03_falso-positivo-fuera-de-normales.png`.
- **Estado**: FALLA → **BUG-01** y **BUG-03** (misma causa: `backend/internal/meter/enums.go:29-38` no tiene rama para `FALSE_POSITIVE`).

## G4 · Ciclo de vida de *Run AI Analysis* (transición de estado)

Modelo observado, con los estados persistidos por la API (`backend/internal/ai/dto.go:12-18`):

```text
IDLE ──POST /ai/analyze──▶ RUNNING ──(el motor termina)──▶ COMPLETED
                              │
                              ├──POST /ai/analyze──▶ RUNNING (200, mismo id; no hay segundo job)
                              ├──(error del motor)──▶ FAILED
                              └──(runTimeout = 2 min)──▶ FAILED
```

`IDLE` no tiene constante propia: es la ausencia de análisis en curso. Los pasos internos pasan por
`PENDING → RUNNING → DONE/FAILED` (`backend/internal/ai/dto.go:23-29`).

### CN-12 · El primer disparo se acepta con 202 y el análisis llega a COMPLETED

- **Capa**: API
- **Técnica**: transición de estado
- **Precondición**: ningún análisis en curso (`IDLE`).
- **Pasos**: 1. `POST /api/v1/ai/analyze`. 2. Leer estado y cuerpo. 3. Consultar `GET /api/v1/ai/analysis/{id}` hasta el estado terminal. 4. Pulsar *Run AI Analysis* en la UI y observar el KPI *Último análisis*.
- **Datos**: sin body; sesión válida.
- **Esperado**: `202` con un `Run` en `RUNNING` y, al terminar, `COMPLETED` con los siete pasos en `DONE` (oráculo: Swagger `POST /ai/analyze` → `202 «Análisis iniciado»`, y `backend/internal/ai/handler.go:20-30`).
- **Obtenido**: `202` · `{"id":"AN-0007","status":"RUNNING","trigger":"MANUAL","narrator":"engine"}`; la consulta posterior devuelve `{"id":"AN-0007","status":"COMPLETED"}` con los 7 pasos en `DONE`. En la UI, el clic generó `AN-0009` y la primera lectura, 60 ms después, ya mostraba «AN-0009 · Completado»: el run dura ~25 ms, así que **el estado «En curso» no es observable en pantalla** (observación registrada; no se reporta como defecto).
- **Estado**: PASA

### CN-13 · Un segundo disparo con un job en curso devuelve el mismo análisis

- **Capa**: API
- **Técnica**: transición de estado
- **Precondición**: `IDLE`; se disparan cinco peticiones simultáneas.
- **Pasos**: 1. Lanzar 5 `POST /api/v1/ai/analyze` en paralelo. 2. Comparar estados HTTP e `id` de las cinco respuestas.
- **Datos**: cinco hilos concurrentes con el mismo token; el motor completa en ~25 ms, así que la concurrencia debe ser real.
- **Esperado**: una sola creación — un `202` y el resto `200` — todas con el mismo `id` (oráculo: Swagger `POST /ai/analyze` → `200 «Ya había un análisis en curso»` y spec CN-3).
- **Obtenido**: un `202` y cuatro `200`; las cinco respuestas con `id: AN-0008`, `status: RUNNING`. Evidencia de la misma regla en la ejecución anterior: `qa/evidencias/api/CN-13_retrigger-200.md` (202 + cinco 200, todas `AN-0006`).
- **Estado**: PASA

**Estados no ejercitados y por qué**: `FAILED` requiere inducir un fallo del motor o del narrador, y
el servicio no expone una palanca de inyección; el timeout de `runTimeout = 2 * time.Minute`
(`backend/internal/ai/service.go:29`) exigiría dos minutos de reloj por una sola transición. Ninguno
de los dos se fuerza; ambos quedan declarados aquí en vez de simulados.

## G5 · Consistencia entre capas

### CN-14 · El consumo y la variación de M-109 coinciden en README, API y UI

- **Capa**: UI
- **Técnica**: consistencia entre capas
- **Precondición**: sesión iniciada; `/medidores`.
- **Pasos**: 1. Buscar `M-109`. 2. Leer *Consumo 24 h*, *Baseline* y *Variación*. 3. Comparar con `GET /api/v1/meter/getById/M-109` y con la fila de M-109 del README.
- **Datos**: M-109, el medidor con la anomalía de referencia en toda la documentación.
- **Esperado**: consumo `2.207,6 kWh` y variación `+109,8 %` en las tres fuentes (oráculo: `backend/README.md:109`).
- **Obtenido**: UI `2.207,6 kWh` / `1.052,2 kWh` / `+109,8 %`; API `consumption_kwh: 2207.6`, `baseline_kwh: 1052.15`, `variation_pct: 109.82`; README `2.207,6 kWh contra 1.052,15 kWh, +109,8 %`. El baseline se pinta con un decimal (`1.052,2` = redondeo de `1052,15`, `formatKwh` usa un decimal por diseño); consumo y variación coinciden exactamente.
- **Estado**: PASA

### CN-15 · La hora de detección se pinta en la zona del navegador, no en la de la planta

- **Capa**: UI
- **Técnica**: consistencia entre capas
- **Precondición**: sesión iniciada; `/anomalias` a 1440 px de ancho (la columna *Detectada* se oculta bajo `lg`).
- **Pasos**: 1. Leer la celda *Detectada* de M-109. 2. Comparar con `detected_at` de `GET /api/v1/anomaly/getAll`.
- **Datos**: M-109, `detected_at = 2026-09-12T14:00:00Z`, con el navegador en `America/Bogota` (UTC−5).
- **Esperado**: `12/09 14:00`, la hora de planta tal como la documenta el producto (oráculo: `backend/README.md:28` «desde 12/09 14:00» y el comentario de intención de `frontend/src/lib/format.ts:51-52`).
- **Obtenido**: `12/09 09:00` (5 h menos). La desviación se repite en las otras filas: M-112 `12/09 19:00` vs `2026-09-13T00:00:00Z`, M-104 `10/09 19:00` vs `2026-09-11T00:00:00Z`, M-106 `07/09 19:00` vs `2026-09-08T00:00:00Z`. Evidencia: `qa/evidencias/BUG-06_hora-de-planta-desfasada.png` y `e2e/tests/e2e-02-bug-06-zona-horaria.spec.ts`.
- **Estado**: FALLA → **BUG-06** (`frontend/src/lib/format.ts:57-58` usa partes locales).

### CN-16 · El orden de prioridad coincide en README, API y UI

- **Capa**: UI
- **Técnica**: consistencia entre capas
- **Precondición**: sesión iniciada; `/anomalias`.
- **Pasos**: 1. Leer la columna *Medidor* de la tabla completa. 2. Comparar con el orden de `GET /api/v1/anomaly/getAll`. 3. Comparar con la tabla del README.
- **Datos**: las cuatro anomalías del dataset.
- **Esperado**: `M-109, M-112, M-104, M-106` en las tres fuentes (oráculo: `README.md:9-14` y `backend/README.md:17-22`).
- **Obtenido**: UI `1 M-109 · 2 M-112 · 3 M-104 · 4 M-106`; API en el mismo orden; README con las mismas cuatro prioridades.
- **Estado**: PASA

## G6 · Formato numérico

### CN-17 · El porcentaje se pinta con coma decimal y signo

- **Capa**: UI
- **Técnica**: partición de equivalencia
- **Precondición**: sesión iniciada; `/medidores`.
- **Pasos**: 1. Buscar `M-109`. 2. Leer la celda *Variación*. 3. Repetir en el detalle del medidor.
- **Datos**: `variation_pct = 109.82` (positivo, con decimales); clases del formateador: positivo, negativo y cero.
- **Esperado**: `+109,8 %` con coma decimal y signo explícito (oráculo: `backend/README.md:109` y `frontend/DESIGN.md`, que fija el formato `es-CO`).
- **Obtenido**: `+109,8 %` en el libro y `+109,8 %` en el detalle; el valor crudo de la API es `109.82`. En la misma tabla, un valor negativo se pinta `−0,1 %` (M-101), con el signo menos tipográfico.
- **Estado**: PASA

### CN-18 · La confianza se pinta con dos decimales y el KPI usa el promedio

- **Capa**: UI
- **Técnica**: partición de equivalencia
- **Precondición**: sesión iniciada; `/anomalias` y `/`.
- **Pasos**: 1. Leer la celda *Confianza* de M-109 y de M-104. 2. Leer el KPI *Confianza IA* del despacho.
- **Datos**: `confidence = 0.95` y `0.86` por anomalía; `ai_confidence = 0.9` en `GET /api/v1/dashboard/getSummary`.
- **Esperado**: `0,95` y `0,86` en la tabla, y el promedio `0,90` en el KPI (oráculo: `backend/README.md:17-22` para las confianzas y `backend/README.md:290-296` para el puntaje de evidencia; formato de `frontend/src/lib/format.ts:36-38`).
- **Obtenido**: tabla `0,95 | Alta` (M-109), `0,95 | Alta` (M-112), `0,86 | Alta` (M-104) y `0,86 | Alta` (M-106); KPI «Confianza IA 0,90 · Alta» con la nota «Promedio de las 4 anomalías».
- **Estado**: PASA

---

## Cierre

- **Ejecutados**: 18 de 18 planificados; ninguno quedó sin ejecutar ni marcado como no aplicable.
- **Recuento por capa y veredicto**:
  - **API (10)**: `PASA` — CN-02, CN-03, CN-04, CN-06, CN-08, CN-09, CN-10, CN-12, CN-13 (9);
    `FALLA` — CN-05 (1).
  - **UI (8)**: `PASA` — CN-01, CN-14, CN-16, CN-17, CN-18 (5); `FALLA` — CN-07, CN-11, CN-15 (3).
  - **Total**: 14 `PASA` / 4 `FALLA`.
- **Defectos alcanzados por los casos**: BUG-01 y BUG-03 (CN-11), BUG-04 (CN-05), BUG-06 (CN-15).
  BUG-02 pertenece a la paginación del libro y se cubre en `SM-05` y `E2E-01`; BUG-05 se observa en el
  despacho y se cubre en `SM-04` y en el orden de órdenes del dashboard.
- **Divergencia no promovida**: CN-07 (búsqueda sensible a mayúsculas contra el contrato publicado).
