# Guion del video de entrega

**Objetivo:** 8:35 · **Techo duro:** 15 min · **Formato:** toma continua, sin edición.

> Este documento es una guía, no un teleprompter. Leerlo palabra por palabra suena a leído.
> Memorizar la idea de cada bloque y decirla con palabras propias.

---

## Pre-flight (5 minutos antes de grabar)

- [ ] `docker compose ps` → `backend` y `frontend` en `Up`
- [ ] `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` → `200`
- [ ] Sesión iniciada en el navegador: `admin@energia.local`
- [ ] Pestañas abiertas en orden: dashboard · libro de medidores · anomalías · `qa/01` · `qa/04`
- [ ] Terminal 1 en `/energy-ai` (para el curl) · Terminal 2 en `/energy-ai/e2e` (para Playwright)
- [ ] `cd e2e && pnpm exec playwright test` corrido **una vez** antes de grabar: los binarios y el `storageState` ya están calientes
- [ ] Notificaciones y Slack silenciados · resolución 1440×900 · zoom del navegador al 100%
- [ ] Ensayo cronometrado completo, con demos en vivo

**Regla de grabación:** tomas completas desde el inicio. Si te trabás, se descarta la toma y se empieza de nuevo. No hay edición, así que no hay "repetir este bloque".

---

## 0:00–0:25 · Apertura

**PANTALLA:** `README.md` del repo en GitHub.

> "Hola, soy Josué Calderón. Esta es mi entrega de la prueba técnica de QA para EnergIA.
>
> Voy a mostrar la estrategia, los defectos más importantes reproducidos en vivo, el análisis de caja blanca y la ejecución de la suite de Playwright. Cada hallazgo del repositorio tiene reproducción, evidencia y causa raíz en archivo y línea.
>
> El veredicto es **NO-GO**, y lo digo ahora para que no quede esperando al final."

---

## 0:25–1:35 · Estrategia y riesgos

**PANTALLA:** `qa/01-plan-de-pruebas.md` → sección de riesgos.

> "El alcance cubrió cinco frentes: plan, humo, caja negra sobre UI y API, caja blanca sobre dos módulos de riesgo, y automatización.
>
> Dejé fuera, y lo dejé escrito, pruebas de carga, pentesting profundo, accesibilidad y matriz multi-navegador. Con doce medidores por catorce días de datos y un día de ejecución, esas pruebas no producen conclusiones defendibles. Prefiero declararlo a rellenar."
>
> "El análisis de riesgo priorizó tres zonas. Primero, el estado derivado de los medidores: el estado se calcula a partir de las anomalías, y ahí hay una regla de negocio con ramas. Segundo, la validación de entrada en la API: una entrada inválida no debería producir un error de servidor. Tercero, el manejo de zona horaria, porque los usuarios son operadores de planta en Colombia y la aplicación corre en `America/Bogota`, mientras los tests corren en UTC.
>
> El criterio de salida fue concreto: un defecto `S2/P1` abierto bloquea la liberación. Se abrieron tres."

---

## 1:35–2:45 · BUG-02 · No existe la página 2

**PANTALLA:** Libro de medidores → señalar el rango de paginación y el botón "Siguiente".

> "Presento los defectos por impacto en el operador: primero los que le impiden trabajar, después los que le dan información incorrecta, y al final los que solo afectan a la API.
>
> Doce medidores, diez por página. La pantalla dice **1 a 10 de 12 medidores** y el botón Siguiente está deshabilitado. M-111 y M-112 son inalcanzables desde la interfaz. No es un problema estético: dos medidores no se pueden operar.
>
> La causa está en `Pagination.tsx`, línea 13: se usa `Math.floor` donde corresponde `Math.ceil`. Con doce y diez, `floor(1.2)` da una página; el cálculo correcto son dos.
>
> S2 por impacto, P1 por urgencia. Es el bloqueador más claro de los tres."

---

## 2:45–3:55 · BUG-06 · Cinco horas de desfase

**PANTALLA:** Lista de anomalías → columna "Detectada" de M-109.

> "La columna Detectada muestra **12/09 09:00**. La API devuelve `2026-09-12T14:00:00Z`. La documentación es explícita: las marcas de tiempo son hora de planta y no deben convertirse a la zona del navegador.
>
> Son cinco horas, exactamente la diferencia entre UTC y Bogotá. Y no es una decisión de diseño: en el mismo archivo, `format.ts` líneas 51 a 63, hay una función que sí formatea hora de planta correctamente. La columna usa la otra. La evidencia interna demuestra que el comportamiento correcto ya existía en el código.
>
> S2/P1. Este lo cubre el test de Playwright que van a ver al final."

---

## 3:55–4:55 · BUG-01 · El tablero cuenta mal

**PANTALLA:** Dashboard → bloque de KPIs.

> "La documentación dice que el estado del medidor se deriva de sus anomalías: un falso positivo no debería contar como alerta.
>
> El KPI muestra **8 normales, 2 alerta, 2 críticas**. Aplicando la regla del oráculo, lo esperado es **9, 1 y 2**. La diferencia es M-106, clasificado como falso positivo y contado igual como alerta.
>
> Severidad S2: es el número que el operador lee primero. Prioridad P2: el dato está mal, pero la pantalla sigue siendo usable. La causa está en `enums.go`, líneas 29 a 38: la rama de falso positivo no existe y cae en el caso por defecto.
>
> Acá está el hallazgo que más me interesa. El test del backend, en `server_test.go:131`, afirma `8/2/2`. El test está escrito sobre el comportamiento defectuoso. Una suite verde no prueba corrección cuando el test comparte el error con el código."

---

## 4:55–5:35 · BUG-04 · Un 500 por un parámetro

**PANTALLA:** Terminal → correr el curl documentado.

> "Un solo parámetro inválido: `pagination.page` en menos uno."

**PANTALLA:** mostrar `HTTP/1.1 500`.

> "El servidor responde 500. Ante una entrada no confiable corresponde 400, con el detalle del error. Un 500 significa que la validación no existe y que el cliente provoca un fallo del servidor.
>
> S2 por impacto, P1 por urgencia: se llega con una línea de curl desde cualquier sesión autenticada. La causa está en `paging.go`, líneas 23 a 36 y 48."

---

## 5:35–5:55 · Los dos que no reproduzco en cámara

**PANTALLA:** `qa/05-defectos.md` → BUG-03 y BUG-05.

> "Los otros dos defectos, con evidencia en el repositorio. **BUG-03**: el filtro Normales esconde el falso positivo M-106 — la API devuelve ocho filas y el medidor no aparece en ninguna. **BUG-05**: el despacho anuncia tres órdenes abiertas y muestra cuatro tarjetas en la misma pantalla.
>
> Ninguno bloquea la liberación, pero los dos contradicen la documentación."

---

## 5:55–7:10 · Caja blanca

**PANTALLA:** `qa/04-caja-blanca.md` → tabla de cobertura.

> "Revisé dos módulos de riesgo.
>
> La suite cubre **79,3%** del backend: un número alto, y aun así hay tres defectos S2/P1 y un test que
> afirma el comportamiento equivocado. `httpx`, donde vive el defecto del 500, no tiene archivos de test
> propios: lo ejercitan los tests del servidor, y `Normalize` y `Paginate` están al 100%, pero ninguno
> afirma qué pasa con una página inválida.
>
> El caso más interesante es otro. La función `StatusOf` tiene **100% de cobertura de sentencias y es
> incorrecta**. La cobertura mide líneas ejecutadas, no ramas de negocio ejercitadas. Ese es el punto
> que quiero dejar: el número no es la calidad; la calidad es qué preguntas responde el test.
>
> Por eso mi veredicto sobre las suites existentes. El backend es **parcialmente confiable**: valida contratos, pero codifica el bug en `server_test.go:131`. El frontend **no es confiable para fechas**, porque `vite.config.ts` fija `TZ=UTC`, justo la zona que esconde el defecto de zona horaria.
>
> Los tres tests que faltan están propuestos como código en el mismo documento, anotados con la aserción y por qué fallan hoy. No los agregué al árbol de la aplicación: la prueba prohíbe modificar `backend/` y `frontend/`."

---

## 7:10–8:10 · Playwright

**PANTALLA:** Terminal 2 en `e2e/`.

> "Un solo comando."

**PANTALLA:** `pnpm exec playwright test` → esperar el resumen.

> "Cuatro pruebas. El setup de autenticación con `storageState`, sin login por test. El flujo de negocio completo. Un test de contrato de API.
>
> Y un test marcado con `test.fail`, que hoy pasa porque el defecto sigue presente: espera `12/09 14:00` y recibe `09:00`. Cuando el defecto se corrija, ese test se pondrá en rojo y obligará a quitar la marca. La suite avisa sola cuando el defecto desaparece, en lugar de quedarse verde para siempre.
>
> Cero `waitForTimeout`, cero reintentos, cero selectores por índice: todo por rol y etiqueta, con la zona horaria fijada en `America/Bogota`. El reporte HTML y el trace quedan guardados cuando algo falla."

---

## 8:10–8:35 · Cierre

**PANTALLA:** `qa/01` → sección de veredicto.

> "Cierre: **NO-GO**. Bloquean BUG-02, BUG-04 y BUG-06, los tres `S2/P1`. BUG-01, BUG-03 y BUG-05 no bloquean, pero deberían corregirse en el mismo ciclo porque comparten causa o contradicen la documentación.
>
> El árbol de la aplicación está intacto: no modifiqué una línea de `backend/` ni de `frontend/`, y la prueba quedó verificable con un `git diff`.
>
> Sobre el uso de IA: la usé para redactar y para generar el andamiaje de Playwright. Cada hallazgo lo verifiqué ejecutándolo y capturando la evidencia antes de reportarlo. Nada está afirmado sin reproducir.
>
> Gracias."

---

## Chequeo posterior a la grabación

- [ ] Duración real ≤ 9:00 (techo aceptable 15:00)
- [ ] Los seis defectos quedan nombrados al menos una vez
- [ ] El `test.fail` se explica como "se pondrá en rojo", no como "pasará solo"
- [ ] No se ve ningún token, `.env`, ni correo distinto de `admin@energia.local`
- [ ] El veredicto NO-GO se dice en la apertura y en el cierre
- [ ] Pegar el enlace en `README.md` § Entrega QA y en `PENDIENTES.md`, con la duración real
