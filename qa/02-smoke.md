# Smoke · EnergIA

**Alcance.** Diez comprobaciones mínimas sobre el entorno congelado: salud de los servicios,
autenticación, las tres pantallas que concentran el valor del producto (despacho, libro de
medidores, anomalías), el disparo de Run AI Analysis y un control negativo de API.

**Línea base.** SHA de la aplicación `15765d9` (congelado durante toda la ejecución), Chromium
156.0.8078.4 (Playwright), viewport 1440×900, `TZ America/Bogota`. Detalle completo en
`qa/evidencias/README.md`.

**Condición de entrada.** Stack arriba según `docker compose ps`, las tres superficies
respondiendo `200` y navegador disponible (§2–§4 de `qa/evidencias/README.md`).

**Regla de salida.** Toda comprobación se ejecuta una vez y su resultado se conserva. Un `FALLA` se
reporta como bloqueador con el valor observado y **no se reintenta hasta que pase**: si el producto
está mal, reintentar sólo esconde el defecto.

| ID | Comprobación | Resultado |
|---|---|---|
| SM-01 | UI servida en `:3000` | PASA |
| SM-02 | Swagger en `:8080/docs` | PASA |
| SM-03 | Login por UI y sesión autenticada | PASA |
| SM-04 | KPIs del tablero de despacho | FALLA → BUG-01 |
| SM-05 | Libro de medidores paginado | FALLA → BUG-02 |
| SM-06 | Búsqueda `M-109` | PASA |
| SM-07 | Detalle del medidor M-109 | PASA |
| SM-08 | Lista de anomalías en orden de prioridad | PASA |
| SM-09 | Disparo de Run AI Analysis | PASA |
| SM-10 | `POST /meter/getAll` sin token | PASA |

---

### SM-01 · La UI se sirve en `http://localhost:3000`

- **Verifica**: que el contenedor de frontend sirva la SPA y que la ruta raíz redirija a la pantalla
  de acceso cuando no hay sesión, sin errores de consola.
- **Por qué está en la compuerta**: si la UI no carga, ninguna comprobación de pantalla posterior es
  ejecutable y toda la evidencia de interfaz queda bloqueada.
- **Ejecución**: navegación a `http://localhost:3000` con contexto limpio (sin sesión) y escucha de
  `console`/`pageerror` durante la carga.
- **Obtenido**: `HTTP 200`, URL final `http://localhost:3000/login`, `<title>EnergIA</title>`, cuerpo
  renderizado con el bloque de presentación ("medidores 12 · lecturas horarias 4.032 · días de datos
  14") y el formulario de acceso. Consola: **0 errores**, 0 `pageerror`.
- **Resultado**: **PASA**

### SM-02 · Swagger accesible en `http://localhost:8080/docs`

- **Verifica**: que el contrato OpenAPI publicado por el backend esté disponible, porque es el
  oráculo de contrato citado por varios defectos de API.
- **Por qué está en la compuerta**: sin Swagger no se puede contrastar el contrato real contra el
  DTO, y los defectos de validación de paginación perderían su oráculo.
- **Ejecución**: `curl -sS -o /dev/null -w "%{http_code}" http://localhost:8080/docs` y lectura del
  HTML servido.
- **Obtenido**: `200`; documento con `<title>EnergIA API</title>` y el contenedor `#swagger-ui`.
- **Resultado**: **PASA**

### SM-03 · Login por UI con la cuenta demo

- **Verifica**: que el flujo real de autenticación (formulario → `POST /api/v1/auth/login` a través
  del proxy de nginx) entregue una sesión utilizable y lleve al tablero.
- **Por qué está en la compuerta**: todas las pantallas y todas las evidencias de API dependen de un
  token válido; un login roto invalida el resto de la suite.
- **Ejecución**: `admin@energia.local` / `admin123` en `/login`, clic en `Entrar`, espera de la
  navegación fuera de `/login`.
- **Obtenido**: URL final `http://localhost:3000/`; el token queda en `localStorage` bajo la clave
  `energyai.token` (217 caracteres; **no se imprime el valor**); el tablero renderiza los encabezados
  "Órdenes emitidas por la IA", "Estado de la planta" y "Libro de medidores".
- **Resultado**: **PASA**

### SM-04 · KPIs del tablero de despacho

- **Verifica**: que el bloque "Estado de la planta" muestre el estado agregado de la planta con los
  totales de medidores, anomalías y atención prioritaria, y que el desglose por estado coincida con
  la regla de negocio documentada.
- **Por qué está en la compuerta**: es la primera superficie de negocio que ve el operador; si sus
  números no son confiables, toda decisión posterior está contaminada.
- **Ejecución**: sesión autenticada, lectura del bloque `Estado de la planta` en `/`.
- **Obtenido** (texto tal como se muestra):
  `Medidores 12 | 8 normales · 2 alerta · 2 críticas | Consumo del periodo 155,3 MWh |
  Últimas 24 h +16,0 % vs. baseline | Anomalías IA 4 | Alta prioridad 2 | Confianza IA 0,90 · Alta |
  Último análisis AN-0001 · Completado`.
  El total de medidores (12) y el de anomalías (4) coinciden. **El desglose no**: se muestran
  `8 normales · 2 alerta · 2 críticas`, mientras `backend/README.md:24` ("Los otros 8 medidores no
  generan alertas", sobre 12 medidores con 4 anomalías) y `backend/README.md:105`
  (`FALSE_POSITIVE → NORMAL`) implican `9 normales · 1 alerta · 2 críticas`. El medidor M-106
  (`FALSE_POSITIVE`, `backend/README.md:22`) está contado como alerta.
- **Resultado**: **FALLA → BUG-01**

### SM-05 · Libro de medidores paginado

- **Verifica**: que `/medidores` liste como máximo 10 filas por página sobre 12 medidores y que el
  rango literal y los controles de navegación permitan alcanzar los 12.
- **Por qué está en la compuerta**: la paginación es la única vía de acceso a los medidores que no
  caben en la primera página; si bloquea la segunda, oculta datos de negocio.
- **Ejecución**: navegación autenticada a `http://localhost:3000/medidores` y lectura de la tabla y
  del `nav` "Paginación".
- **Obtenido**: 10 filas (`M-101`…`M-110`); rango literal **`1–10 de 12 medidores`**; botón
  `Anterior` deshabilitado; botón `Siguiente` **deshabilitado**. `M-111` y `M-112` no son alcanzables
  desde la UI.
- **Resultado**: **FALLA → BUG-02**

### SM-06 · Búsqueda de `M-109`

- **Verifica**: que el filtro por identificador devuelva exactamente el medidor buscado y actualice
  el rango y la URL.
- **Por qué está en la compuerta**: la búsqueda es el atajo que usa el operador cuando ya sabe qué
  medidor revisar; un filtro que devuelve de más o de menos cambia el diagnóstico.
- **Ejecución**: en `/medidores`, escribir `M-109` en el campo `Medidor` y pulsar `Buscar medidor`.
- **Obtenido**: 1 fila, `M-109`, rango `1–1 de 1 medidores`, URL
  `http://localhost:3000/medidores?medidor=M-109`.
- **Resultado**: **PASA**

### SM-07 · Detalle del medidor M-109

- **Verifica**: que el detalle abra con el medidor correcto y muestre el sello de estado y la
  variación calculada.
- **Por qué está en la compuerta**: es la pantalla donde el operador confirma la magnitud del
  problema antes de actuar; un detalle vacío o inconsistente invalida la orden de trabajo.
- **Ejecución**: navegación autenticada a `http://localhost:3000/medidores/M-109`.
- **Obtenido**: encabezado `M-109`; sello `Crítica`; `Consumo actual · 24 h 2.207,6 kWh`; `Baseline
  diario 1.052,2 kWh`; `Variación +109,8 %`; `Severidad Alta`; `Anomalía real`; bloque de variables
  eléctricas (voltaje 217,5 V, corriente 402,8 A, factor de potencia 0,76).
- **Resultado**: **PASA**

### SM-08 · Lista de anomalías en orden de prioridad

- **Verifica**: que `/anomalias` muestre las 4 anomalías y las ordene por prioridad según la tabla
  del producto.
- **Por qué está en la compuerta**: el orden es la recomendación operativa; un orden distinto hace
  que el operador atienda primero el caso equivocado.
- **Ejecución**: navegación autenticada a `http://localhost:3000/anomalias` y lectura de la columna
  `Medidor` en orden de fila.
- **Obtenido**: 4 filas, orden **`M-109`, `M-112`, `M-104`, `M-106`**, que coincide con
  `README.md:9-14`. Encabezado: "4 anomalías detectadas · 2 requieren atención prioritaria".
  Observación adicional para el informe de defectos: la columna `Detectada` muestra
  `12/09 09:00`, `12/09 19:00`, `10/09 19:00`, `07/09 19:00`, desplazadas 5 h respecto de la hora de
  planta declarada en la API; se documenta como BUG-06, no como falla de esta comprobación, cuyo
  criterio es cantidad y orden.
- **Resultado**: **PASA**

### SM-09 · Disparo de Run AI Analysis

- **Verifica**: que el botón principal inicie un análisis, que la API responda con la aceptación
  documentada (`202`) y que la UI refleje el ciclo hasta el estado final.
- **Por qué está en la compuerta**: es la acción que recalcula todo el producto; si falla o devuelve
  otro contrato, el resto de la aplicación queda con datos obsoletos.
- **Ejecución**: clic en `Run AI Analysis` en `/`, captura de la respuesta de red a
  `POST /api/v1/ai/analyze` y lectura del estado del botón y de la hoja de progreso.
- **Obtenido**: `POST http://localhost:3000/api/v1/ai/analyze` → **`HTTP 202`**, cuerpo
  `{"id":"AN-0002","status":"RUNNING","trigger":"MANUAL","narrator":"engine",...}`. El botón pasa a
  `Analizando…` y la hoja muestra los siete pasos; el run termina en 39 ms y el encabezado queda en
  `AN-0002 · completado · 22 oct 12:38:47`. El estado observado coincide con el contrato
  (`202` en el primer disparo), por lo que no hay divergencia que trasladar a caja negra.
- **Resultado**: **PASA**

### SM-10 · `POST /meter/getAll` sin `Authorization`

- **Verifica**: que la API rechace una petición sin token con `401` y el mensaje del contrato, en
  lugar de servir datos.
- **Por qué está en la compuerta**: es el control negativo de seguridad de la capa de datos; si
  devuelve `200`, todo el análisis de negocio queda expuesto y la suite no es confiable.
- **Ejecución**:
  `curl -sS -i -X POST http://localhost:8080/api/v1/meter/getAll -H 'Content-Type: application/json' -d '{"pagination":{"page":1,"size":10}}'`
- **Obtenido**: `HTTP/1.1 401 Unauthorized`, cuerpo
  `{"status_code":401,"message":"Falta el token de autenticación","timestamp":"2026-10-22T17:38:32Z","path":"/api/v1/meter/getAll"}`.
- **Resultado**: **PASA**

---

## Veredicto de la compuerta

**8 de 10 comprobaciones PASA; 2 FALLA.** Las dos fallas son de producto, no de entorno:

- `SM-04` → **BUG-01**: el desglose por estado del tablero muestra `8/2/2` donde el oráculo exige
  `9/1/2`.
- `SM-05` → **BUG-02**: la paginación del libro de medidores imprime `1–10 de 12` y deshabilita
  `Siguiente`, dejando `M-111` y `M-112` inalcanzables.

**¿Procede la ejecución profunda?** Sí, con una condición: la compuerta de entorno está completa y
sana (servicios `200`, login, Swagger, búsqueda, detalle, anomalías, Run AI Analysis y control
negativo de API), de modo que las herramientas de medición son confiables. Las comprobaciones de
producto que fallan se conservan tal como se observaron y **no se reintentan**.

**Bloqueadores de release detectados en esta compuerta: `BUG-01` y `BUG-02`.** La compuerta habilita
la fase de casos y defectos; no habilita una liberación del producto.
