# EnergIA — Agent Instructions (Prueba técnica QA)

## Proyecto

Plataforma de monitoreo de medidores eléctricos con detección de anomalías asistida por IA.
**Backend** en Go (motor de detección, JWT, Run AI Analysis, narrador opcional con OpenAI) · **Frontend** en React 19 + Vite + TanStack Query. Datos en `backend/data/*.csv` (14 días × 12 medidores).

> Este repo es una **evaluación de QA**, no un proyecto de producto. El objetivo no es mejorar la app: es **encontrar, documentar y automatizar defectos**. Leer [`PRUEBA_QA.md`](PRUEBA_QA.md) antes de tocar nada.

---

## 🚫 Reglas duras (no negociables)

1. **NO modificar el código de la aplicación.** Ni `backend/internal/**`, ni `frontend/src/**`, ni config de build. Los defectos se **reportan**, no se arreglan. *(Excepción explícita del enunciado: se pueden agregar tests.)*
2. **NO inventar hallazgos.** Todo defecto requiere reproducción + evidencia (captura, video, curl, request/response). Sin evidencia, no es defecto: es hipótesis, y va etiquetada como tal.
3. **NO afirmar "verde" sin haber corrido el comando.** Pegar la salida real. Si algo no se pudo correr, se documenta como limitación.
4. **NO tocar `PENDIENTES.md` sin marcar la evidencia.** Cada `[x]` debe apuntar al archivo o comando que lo demuestra.
5. **NO usar `waitForTimeout`** ni esperas fijas en Playwright (la rúbrica lo penaliza explícitamente).
6. **NO commitear `.env`, tokens ni capturas con datos personales.**

---

## 📁 Estructura de entrega (literal del enunciado)

```
qa/
├── 01-plan-de-pruebas.md      # alcance, riesgos, tipos, criterios + resumen ejecutivo
├── 02-smoke.md
├── 03-casos-caja-negra.md     # (o .xlsx / .csv)
├── 04-caja-blanca.md
├── 05-defectos.md             # (o 1 issue de GitHub por defecto)
└── evidencias/
e2e/
├── README.md
├── playwright.config.ts
└── tests/…
```

---

## 🔑 Jerarquía de oráculos

Cuando hay conflicto, **gana el de arriba** y el conflicto *es un defecto de la capa que se desvía*:

1. `PRUEBA_QA.md` — reglas de la evaluación (qué se entrega y cómo se juzga).
2. `README.md` (raíz) — resultado esperado del producto: la tabla de 4 medidores con su acción.
3. `backend/README.md` — API, reglas de negocio del motor, metodología, variables de entorno.
4. `frontend/README.md` · `frontend/PRODUCT.md` · `frontend/DESIGN.md` — comportamiento de pantallas.
5. Swagger (`http://localhost:8080/docs`) — contrato real de la API.
6. Sentido común / estándar de la industria — solo si los anteriores callan; **dejarlo escrito**.

> Si la doc es ambigua: tomar la decisión más razonable, **escribirla** y seguir. Eso suma, no resta.

---

## ⚙️ Comandos

```bash
# Levantar todo (no requiere Go instalado)
cp .env.example .env
docker compose up -d --build
#   Frontend → http://localhost:3000
#   Swagger  → http://localhost:8080/docs
#   Login    → admin@energia.local / admin123

# Logs / estado
docker compose ps
docker compose logs -f backend

# Backend: tests (Go NO está instalado en el host → usar el contenedor)
docker compose exec backend go test ./...

# Frontend
cd frontend && pnpm install && pnpm test && pnpm lint && pnpm typecheck

# E2E
cd e2e && pnpm install && pnpm exec playwright test

# API a mano (nginx hace proxy de /api → /api/v1)
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@energia.local","password":"admin123"}'
```

---

## 🌎 Entorno de prueba

| Dato | Valor |
|---|---|
| Zona horaria objetivo | **`America/Bogota`** (usuarios = operadores de planta en Colombia) |
| Navegador de referencia | Chromium (versión exacta en los reportes) |
| Datos | 12 medidores · 14 días · lecturas horarias |
| Commit de referencia | pegar el `git rev-parse --short HEAD` al iniciar |

> Probar también el contraste UTC vs. Bogotá: los agregados por día/hora son el punto clásico de desfase de 5 h.

---

## 🏷️ Convenciones de IDs

| Prefijo | Uso |
|---|---|
| `SM-01…` | Smoke |
| `CN-01…` | Caja negra (UI o API; indicar capa) |
| `CB-01…` | Caja blanca (módulo + archivo:línea) |
| `BUG-01…` | Defecto |
| `E2E-01…` | Test automatizado |

**Severidad**: `S1` bloqueante / `S2` mayor / `S3` menor / `S4` cosmético.
**Prioridad**: `P1` inmediata / `P2` alta / `P3` media / `P4` baja.
Severidad y prioridad **son ejes distintos** — si difieren, explicar por qué (la rúbrica lo pide).

---

## 📋 Plantilla obligatoria de caso de prueba

```markdown
### CN-0X · <título en una línea>
- **Capa**: UI | API
- **Técnica**: partición de equivalencia | valores límite | tabla de decisión | negativa | consistencia entre capas
- **Precondición**: …
- **Pasos**: 1. … 2. … 3. …
- **Datos**: …
- **Esperado**: … (<fuente del oráculo>)
- **Obtenido**: …
- **Estado**: ✅ PASA | ❌ FALLA → BUG-0X | ⚠️ BLOQUEADO
```

> La **técnica va nombrada** en cada caso: la rúbrica evalúa el diseño, no la cantidad. Un caso sin técnica declarada es un caso que no demuestra criterio.

## 🐞 Plantilla obligatoria de defecto

```markdown
### BUG-0X · <título en una línea>
- **Severidad / Prioridad**: Sx / Py — <justificación de la diferencia si aplica>
- **Entorno**: <navegador + versión> · <SO> · TZ America/Bogota · commit <sha>
- **Precondición**: …
- **Pasos**: 1. … 2. … 3. …
- **Datos usados**: …
- **Esperado**: … (<fuente: doc/regla/sentido común>)
- **Obtenido**: …
- **Evidencia**: `qa/evidencias/BUG-0X_<descripcion>.png` · curl · video
- **Causa raíz probable**: `ruta/archivo.go:linea`
- **Detección automática**: test propuesto (`e2e/tests/…` o unitario)
```

---

## 🧾 Convenciones de evidencia para API

> La Parte C exige casos **sobre la UI y sobre la API**, y la Parte E exige *request/response (curl o similar)* como evidencia. La captura de pantalla prueba lo que **viste**; el request/response prueba lo que **pasó**.

**Un archivo por caso/defecto**, en `qa/evidencias/api/`:

```
qa/evidencias/api/
├── CN-07_paginacion-limite.md
├── BUG-02_severidad-invertida.md
└── run.sh                      # corre todos los curls reproducibles
```

**Formato obligatorio del archivo:**

```markdown
### CN-07 · Paginación: página fuera de rango
- **Commit**: `abc1234` · **Fecha**: 2026-10-21 09:14 (America/Bogota)
- **Oráculo**: backend/README.md §Paginación · Swagger `GET /api/medidores`

#### Request
```http
GET /api/medidores?page=99&pageSize=10
Authorization: Bearer <token>
```

#### Response
```http
HTTP/1.1 200 OK
Content-Type: application/json
```
```json
{ "data": [], "meta": { "total": 12, "page": 99, "pageSize": 10 } }
```

#### Veredicto
Se esperaba `404` o `page` clampeada a la última. Devolvió `200` con `page: 99` fuera de rango → **BUG-02**.
```

**Reglas:**

- **Enmascarar credenciales**: `Bearer <token>`, nunca el JWT completo. Tampoco emails reales ni IPs internas.
- **Guardar el status code siempre** (`curl -i`) — `401` vs `403` vs `200` es la mitad del hallazgo.
- **Nunca `200` como sinónimo de "está bien"**: verificar el body y compararlo con el oráculo de turno.
- **Incluir el comando ejecutable** (`curl -s … | jq .`), no solo el resultado: tiene que ser reproducible por el entrevistador.
- **Token por variable de entorno** en `run.sh` (`TOKEN=$(...)`), nunca hardcodeado en el repo.
- **`jq` para los valores de negocio**: extraer solo los campos que sostienen la afirmación (severidad, prioridad, total, tipo) y dejarlos visibles en la evidencia.
- **Anotar la divergencia explícitamente**: si la API contradice Swagger o el README, citar el archivo y la sección. Eso convierte "no me gusta el número" en un **defecto de contrato**.
- **Un archivo = un hallazgo.** No mezclar varios casos en el mismo `.md`; si no, no se puede citar en el reporte.

## 🎭 Reglas de Playwright

- Locators **por rol/label** (`getByRole`, `getByLabel`, `getByTestId`) — nada de CSS/XPath frágiles.
- Login **una sola vez** vía `storageState` (proyecto `setup`), no en cada test.
- Page Objects o fixtures; datos y config fuera del test.
- Aserciones de **negocio** (un número, un estado, una acción), no "la página cargó".
- El test del defecto **debe fallar hoy**: marcarlo con `test.fail()` y explicar por qué.
- `timezoneId: 'America/Bogota'` en la config; `trace`/`video` on-failure.
- **`retries: 0`** — reintentar hasta verde esconde flakiness y es lo contrario de lo que evalúan. Si un test es inestable, se arregla el test, no se reintenta.

---

## 🔄 Workflow del proyecto

`PENDIENTES.md` es el tablero vivo: **solo pendientes reales**. Lo cerrado se marca `[x]` con evidencia y, si es un bloque completo, se resume en una línea al final del archivo — no se acumula historial largo ahí.

Al terminar cualquier bloque: actualizar `PENDIENTES.md` **antes** de pasar al siguiente.

---

## ✅ Antes de entregar

- [ ] `docker compose up -d --build` desde cero funciona en máquina limpia.
- [ ] `qa/01..05` completos, con el resumen ejecutivo escrito.
- [ ] Evidencias presentes y nombradas `BUG-0X_*`.
- [ ] `e2e/` corre con **un solo comando** y el README lo dice.
- [ ] El test del defecto está en `test.fail()` y falla por la razón correcta.
- [ ] `git diff` **no** toca código de la app.
- [ ] Video subido y enlazado en el README de entrega.
- [ ] Declaración de uso de IA (para qué y cómo se verificó).
