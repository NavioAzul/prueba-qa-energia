# Pendientes — Prueba técnica · QA (EnergIA)

> Última actualización: **Oct 20 2026** · Regla: PENDIENTES = solo lo que falta. Lo cerrado se marca `[x]` con la evidencia; el detalle largo va al `qa/01-plan-de-pruebas.md` y a `qa/evidencias/`.
>
> **Entrega: 2 días calendario.** Recibida Oct 20 → **vence Oct 22**. El video (máx. 15 min) se graba al final, con todo ya reproducible.

---

### 🚨 Frente 0 — Bloqueadores (sin esto no arranca nada)

- [ ] **Clonar/forkear el repo** — no está en la máquina (busqué home, Documents, Downloads, `mdfind`). Fork privado o repo nuevo, y **compartir acceso** al final.
- [ ] **Crear `qa/` y `e2e/`** en la raíz del repo (estructura exacta del §3 del enunciado).
- [ ] **Levantar la app**: `cp .env.example .env` → `docker compose up -d --build`.
  - [ ] Verificar `http://localhost:3000` → 200 y `http://localhost:8080/docs` → Swagger.
  - [ ] Login `admin@energia.local` / `admin123`.
- [ ] 🟡 **Go NO está instalado** en la máquina (`go: command not found`). Docker alcanza para la app, **pero** la Parte D pide `go test ./...` → instalar Go o correr los tests **dentro del contenedor** (`docker compose exec backend go test ./...`). Decidir y documentarlo.
- [ ] ✅ Docker 29.3.1 + Compose v5.1.1 funcionando · Node v25.2.1 · pnpm 11.7.0.
- [ ] **Registrar el commit/branch** del repo original (va en el campo *Entorno* de cada defecto).
- [ ] **Fijar el entorno de prueba**: navegador + versión, SO, y **timezone `America/Bogota`** (los usuarios son operadores en Colombia → probar explícitamente en esa zona, no en la del host).

---

### 🧾 Entregables — checklist de aceptación

> Si falta uno, la rúbrica castiga. La estructura es literal la del enunciado.

| # | Entregable | Estado | DoD (cuándo está listo) |
|---|---|---|---|
| 1 | `qa/01-plan-de-pruebas.md` | [ ] | Alcance + riesgos + tipos + criterios entrada/salida + **resumen ejecutivo** al final |
| 2 | `qa/02-smoke.md` | [ ] | Casos mínimos + **por qué** cada uno + resultado de ejecutarlos |
| 3 | `qa/03-casos-caja-negra.md` | [ ] | **15–25 casos**, con técnicas nombradas y estado |
| 4 | `qa/04-caja-blanca.md` | [ ] | **≥2 módulos** revisados + juicio sobre los tests existentes + tests propuestos |
| 5 | `qa/05-defectos.md` | [ ] | **≥2 defectos** completos (o 1 issue de GitHub por defecto) |
| 6 | `qa/evidencias/` | [ ] | Capturas/video/curl por cada defecto, con nombre `BUG-0X_*` |
| 7 | `e2e/README.md` | [ ] | **Un solo comando** para instalar y correr |
| 8 | `e2e/playwright.config.ts` + `tests/` | [ ] | 1 flujo E2E de negocio + 1 test del defecto |
| 9 | **Video** (≤15 min) | [ ] | Enlace en el README de entrega |
| 10 | README de entrega | [ ] | Enlace al video + cómo correr todo + declaración de uso de IA |

---

### 🧪 Parte A · Plan de pruebas (1–2 páginas, no más)

- [ ] **Alcance**: qué pruebo / qué dejo fuera **y por qué** (ej.: sin pruebas de carga, sin pentest, sin accesibilidad profunda — justificar por tiempo).
- [ ] **Análisis de riesgos** priorizado. Candidatos por impacto:
  1. 🔴 **Motor de detección** (tipo → estado → severidad → prioridad): si clasifica mal, el operador actúa sobre el medidor equivocado. Es el core del producto.
  2. 🔴 **Calidad de datos** (voltaje / factor de potencia incoherentes): confundir "dato malo" con "anomalía real" genera falsos positivos y desconfianza.
  3. 🟠 **Auth/JWT**: exposición de datos de consumo o bypass de login.
  4. 🟠 **Zona horaria `America/Bogota`**: agregados por día/hora, límites de fecha y "últimas 24 h" → desfase de 5 h clásico.
  5. 🟡 **Contrato API ↔ UI ↔ docs**: el README es el oráculo; divergencia = defecto de una de las tres capas.
  6. 🟡 **Paginación / filtros / búsqueda**: off-by-one, total vs. página, filtro que se pierde al paginar.
- [ ] **Tipos de prueba por capa**: UI (E2E manual + Playwright), API (curl/Postman + `request`), unitario (Parte D).
- [ ] **Criterios de entrada**: build arriba, login OK, datos CSV cargados, Swagger accesible.
- [ ] **Criterios de salida**: smoke 100 % ejecutado · 15–25 casos de caja negra con resultado · ≥2 defectos con evidencia · E2E verde (y el del defecto en `test.fail()`) · resumen ejecutivo escrito.
- [ ] **Decisión de producto declarada por escrito** cuando algo sea ambiguo (el enunciado lo premia explícitamente).
- [ ] **Matriz de trazabilidad** (va dentro de `01-plan-de-pruebas.md`): cada riesgo → sus casos → sus defectos. Demuestra que el diseño de casos respondió al riesgo, no al azar.

| Riesgo | Casos que lo cubren | Defecto encontrado |
|---|---|---|
| R1 · Motor clasifica mal → operador actúa sobre el medidor equivocado | CN-01…CN-04, CN-12 | BUG-01, BUG-02, BUG-03 |
| R2 · Calidad de datos confundida con anomalía real | CN-05, CN-06 | — |
| R3 · Auth/JWT: acceso indebido o sesión que no expira | CN-13, CN-14, CN-19 | BUG-05 (bearer), BUG-07 (logout) |
| R4 · Zona horaria America/Bogota | CN-15, CN-16, E2E-03 | BUG-06 |
| R5 · Contrato API ↔ UI ↔ docs | CN-07, CN-08, CN-17 | BUG-01, BUG-05 |
| R6 · Paginación / filtros / búsqueda | CN-09, CN-10, CN-11 | BUG-03, BUG-04, BUG-05 |

> Los IDs de caso se numeran recién al escribir `03-casos-caja-negra.md`; esta tabla se corrige al final para que coincida. Una matriz desactualizada es peor que no tener matriz.

---

### 💨 Parte B · Smoke (el mínimo para decir "este build se puede probar")

> 8–10 casos, cada uno con **justificación**. Si alguno falla, no se sigue: se reporta como bloqueante.

- [ ] **SM-01** App responde en `:3000` (no pantalla en blanco / no error de consola crítico).
- [ ] **SM-02** Login con credenciales válidas → entra al dashboard.
- [ ] **SM-03** Login con password incorrecta → error visible, **no** entra.
- [ ] **SM-04** El Libro de medidores lista **12 medidores**.
- [ ] **SM-05** Abrir el detalle de un medidor → carga serie de 14 días sin error.
- [ ] **SM-06** La tabla de prioridades muestra los 4 casos del README (M-109, M-112, M-104, M-106) **en ese orden**.
- [ ] **SM-07** `GET /api/...` (health o equivalente) responde 200 en Swagger.
- [ ] **SM-08** Llamada a la API **sin token** → 401 (no 200).
- [ ] **SM-09** Run AI Analysis devuelve algo (con o sin `OPENAI_API_KEY`, debe haber fallback del motor).
- [ ] **SM-10** Persistencia del login al recargar (token en storage) o re-login limpio — sin loops.

---

### 🔍 Parte C · Caja negra (15–25 casos, UI **y** API)

> Regla: cada caso lleva `ID · Título · Precondición · Pasos · Datos · Esperado · Obtenido · Estado`. **Técnica nombrada por caso** — la rúbrica evalúa el diseño, no la cantidad.

- [ ] **Partición de equivalencia + valores límite**
  - [ ] Filtro de fechas: 1 día / 14 días / rango invertido (fin < inicio) / fechas fuera del dataset / mismo día.
  - [ ] Paginación: página 0, 1, última, **última+1**, `pageSize` 0, negativo, gigante, no numérico.
  - [ ] Búsqueda por medidor: existente, inexistente, vacío, con espacios, **case-sensitive** (`m-109` vs `M-109`), subcadena.
  - [ ] Login: email válido/ inválido, password vacía, 1 carácter, email con mayúsculas, espacios al final.
- [ ] **Tabla de decisión del motor** (la más valiosa): construí la matriz **tipo → estado → severidad → prioridad** y verificá cada combinación contra `backend/README.md`.
  - [ ] Anomalía real (M-109) → severidad alta → prioridad 1 → "Investigar en sitio".
  - [ ] Calidad de datos (M-112) → estado distinto de "anomalía" → prioridad 2 → "Validar el medidor".
  - [ ] Anomalía explicable (M-104) → no escala como real → prioridad 3 → "Actualizar baseline".
  - [ ] Falso positivo (M-106) → no se escala → prioridad 4 → "No escalar".
  - [ ] **Caso combinatorio**: dos medidores con el mismo % de desvío pero distinto estado → ¿la severidad depende del % o del tipo? Verificar que no esté invertido.
- [ ] **Pruebas negativas / validación de entrada**
  - [ ] API con JSON malformado, campos faltantes, tipos cambiados (`string` donde va número), payload gigante.
  - [ ] Token expirado / firma inválida / `Authorization: Bearer` vacío → 401 y **no** 500.
  - [ ] ID de medidor inexistente → 404 (no 200 con vacío ni 500).
- [ ] **Consistencia entre capas** (3 oráculos: API ↔ UI ↔ README): tomar 3 medidores y comparar el mismo número en las tres fuentes.
- [ ] **Zona horaria**: correr un caso con `TZ=America/Bogota` y otro con UTC; si el "día" del agregado cambia, es defecto (documentar cuál es el correcto según el README).
- [ ] **Formato numérico**: `+110,5 %` con coma decimal (es-CO) vs. `110.5`. Verificar que el redondeo del README coincida con lo mostrado.
- [ ] **Regresión de los 4 casos del README**: la tabla de la portada es **el resultado esperado oficial**. Cualquier desvío es defecto de primera plana.

---

### 🧬 Parte D · Caja blanca (≥2 módulos de riesgo)

- [ ] **Módulo 1 — motor de anomalías** (`backend/internal/**`): ramas del clasificador, umbrales, condiciones compuestas, qué pasa con datos faltantes/NaN/negativos, y el orden de evaluación (si dos reglas aplican, ¿cuál gana?).
- [ ] **Módulo 2 — auth/JWT**: generación, expiración, validación de firma, middleware aplicado a todas las rutas, y qué pasa con `JWT_SECRET` vacío.
- [ ] **Backup — ingesta CSV**: parseo de decimales, filas incompletas, duplicados, encoding, timezone de la columna horaria.
- [ ] **Auditar los tests existentes**: `go test ./...` y `pnpm test` → cobertura real, qué casos no tocan, si hay mocks que tapan el bug (patrón clásico: mock con forma distinta a la real). **Veredicto explícito: ¿confío en la suite? ¿por qué?**
- [ ] **Proponer/ escribir tests unitarios** para cada defecto encontrado (se permite agregar tests; **no** tocar código de la app).
- [ ] Anotar **archivo:línea** de cada causa raíz probable (lo pide la Parte E).

---

### 🐞 Parte E · Defectos (mínimo 2, ideal 4–6)

> Plantilla fija por defecto. Sin evidencia no cuenta.

- [ ] **BUG-01** — `Título` · Severidad `Sx` · Prioridad `Py` (explicar por qué difieren) · Entorno (navegador/SO/TZ/commit) · Pasos · Datos · Esperado (citando la fuente) · Obtenido · Evidencia · Causa raíz probable (`archivo:línea`) · Cómo detectarlo automáticamente.
- [ ] **BUG-02** — ídem.
- [ ] **BUG-03 (deseable)** · [ ] **BUG-04 (deseable)** · [ ] **BUG-05 (deseable)**
- [ ] Clasificar cada uno por **origen**: UI · API · motor · datos · documentación divergente.
- [ ] Marcar al menos uno como **candidato a test Playwright** (Parte F lo exige).

**Hipótesis a verificar (no son defectos todavía — confirmar con evidencia):**
- [ ] Timezone: agregados diarios calculados en UTC y mostrados como Bogotá (o al revés).
- [ ] Prioridad/severidad invertida en alguna combinación tipo→estado.
- [ ] Total de paginación calculado sobre la página y no sobre el dataset.
- [ ] Filtro que se resetea al cambiar de página o al recargar (falta de sync en URL).
- [ ] Caso "calidad de datos" que igual se cuenta como anomalía real en los KPIs.
- [ ] `%` de desvío calculado sobre baseline equivocado (media vs. mediana, o incluyendo el día anómalo en el baseline).
- [ ] Divergencia entre lo que documenta el README y lo que devuelve la API (contrato).
- [ ] Fallback de OpenAI que rompe la respuesta cuando no hay `OPENAI_API_KEY`.

---

### 🎭 Parte F · Playwright (25 % de la nota)

- [ ] Proyecto en `e2e/` con **TypeScript**.
- [ ] `playwright.config.ts` con `baseURL`, `timezoneId: 'America/Bogota'`, trace/video on-failure.
- [ ] **Login reutilizable** con `storageState` (un `setup` project, **no** login en cada test).
- [ ] **Page Objects** o fixtures; datos de prueba y config separados del test.
- [ ] **E2E obligatorio**: login → Libro de medidores → filtrar/buscar → detalle del medidor → **validar datos de negocio** contra lo esperado (no "la página cargó").
- [ ] **Test del defecto**: falla hoy, pasa al corregirse → `test.fail()` + comentario explicando **qué** prueba y **por qué** falla.
- [ ] Locators `getByRole` / `getByLabel` / `getByTestId` — **cero** CSS/XPath frágiles.
- [ ] **Cero `waitForTimeout`** ni esperas fijas (lo evalúan explícitamente).
- [ ] `e2e/README.md` con **un solo comando** (`pnpm e2e` o similar).
- [ ] **Extras (suman)**: tests de API con `request` · segundo navegador · workflow de GitHub Actions que levante la app y corra la suite · reporte HTML.

---

### 🎥 Video y cierre

- [ ] Guion de ≤15 min: estrategia (2–3) → casos clave (4–5) → **reproducir 2–3 defectos en vivo** (4–5) → correr Playwright (2) → resumen ejecutivo (1).
- [ ] Subir a YouTube no listado / Loom / Drive y pegar el enlace en el README de entrega.
- [ ] **Resumen ejecutivo (½ página)**: ¿liberarías este build a producción? ¿Por qué? ¿Qué riesgos quedan abiertos?
- [ ] Declaración de uso de IA: **para qué** la usé y **cómo** verifiqué sus hallazgos (lo valoran, no lo penalizan).
- [ ] Verificar que el repo compartido tenga: `qa/`, `e2e/`, README con video, **sin** cambios en el código de la app.

---

### 📊 Rúbrica → dónde poner el esfuerzo

| Criterio | Peso | Implicancia práctica |
|---|---|---|
| Defectos y calidad de reportes | **30 %** | Priorizar: 4–6 defectos bien documentados > 20 casos sueltos |
| Diseño de casos | **25 %** | Nombrar la técnica en cada caso + tabla de decisión del motor |
| Playwright | **25 %** | Los 6 "lo que vamos a mirar" son requisitos, no sugerencias |
| Caja blanca + tests existentes | **10 %** | Veredicto explícito sobre la confiabilidad de la suite |
| Comunicación | **10 %** | Plan corto, resumen ejecutivo claro, video ordenado |

---

### 🧩 Decisiones abiertas (resolver y dejar escritas)

- [ ] ¿Go nativo o `docker compose exec backend go test ./...` para la Parte D?
- [ ] ¿Repo privado nuevo o fork? (afecta la entrega y los permisos)
- [ ] ¿Defectos como `05-defectos.md` o como **issues de GitHub** (el enunciado permite ambos)?
- [ ] Profundidad de la Parte A: 1 página (recomendado) vs. 2.
- [ ] TZ de los asserts E2E: `America/Bogota` fijo en config (recomendado) — evita flakiness del host.

---

### 🗓️ Plan de 2 días (sugerido)

| Bloque | Qué | Salida |
|---|---|---|
| **Día 1 AM** | Frente 0 + Parte B (smoke) + primera pasada de C | App arriba + `02-smoke.md` |
| **Día 1 PM** | Caja negra completa + API con curl + tabla de decisión | `03-casos-caja-negra.md` |
| **Día 2 AM** | Caja blanca + `go test` + `pnpm test` + confirmar defectos con causa raíz | `04-caja-blanca.md` + BUGs confirmados |
| **Día 2 PM (1)** | Playwright: setup + E2E + test del defecto | `e2e/` verde |
| **Día 2 PM (2)** | `05-defectos.md` + evidencias + plan + resumen ejecutivo | `qa/` completo |
| **Día 2 noche** | Grabar video y compartir | Entrega |

---

### 📝 Bitácora de avance

| Fecha | Qué se hizo | Evidencia |
|---|---|---|
| Oct 20 | Documento creado. Repo no encontrado localmente; Docker OK, Go ausente. | este archivo |
| | | |
