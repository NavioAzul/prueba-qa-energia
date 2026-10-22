# Suite E2E — EnergIA

Automatización de interfaz y de contrato con **Playwright + TypeScript**, en un proyecto
**independiente** (`e2e/`): tiene su propio `package.json`, `tsconfig.json`, lockfile y
`node_modules`, y **nunca importa ni extiende `../frontend`**.

Los casos automatizados cubren el flujo de negocio, el contrato de la API a través de nginx y
**un defecto conocido** marcado con `test.fail()`.

---

## Requisitos

La aplicación tiene que estar levantada (ENV-1):

```bash
cp .env.example .env
docker compose up -d --build     # UI :3000 · API :8080
```

Nada más: Node + pnpm y la app arriba. No hace falta Go, ni una base de datos, ni variables de
entorno en `e2e/`.

---

## Un solo comando

Desde `e2e/`:

```bash
pnpm install && pnpm exec playwright install chromium && pnpm exec playwright test
```

`pnpm install` instala `@playwright/test@1.64.1` (fijado en `package.json`, con su lockfile
propio); `pnpm exec playwright install chromium` descarga **la revisión de Chromium que
corresponde a esa versión** —la instalación está fijada por la dependencia, no por la caché de
la máquina—; y el tercer comando corre la suite completa.

### Salida real capturada

```text
Already up to date
Done in 528ms using pnpm v11.7.0

Running 4 tests using 1 worker

  ✓  1 [setup] › tests/auth.setup.ts:13:1 › iniciar sesión una vez y guardar el estado de sesión (723ms)
  ✓  2 [chromium] › tests/e2e-01-flujo-negocio.spec.ts:14:1 › E2E-01 · el flujo de negocio muestra los valores de planta del medidor y el orden de las órdenes (1.0s)
  ✓  3 [chromium] › tests/e2e-03-api-contrato.spec.ts:15:1 › E2E-03 · el contrato de la API responde como está documentado (128ms)
  ✘  4 [chromium] › tests/e2e-02-bug-06-zona-horaria.spec.ts:34:1 › E2E-02 · la hora de planta de M-109 no se desplaza 5 h (8.1s)

  4 passed (13.4s)
```

El `✘` de la prueba 4 **no es un fallo de la suite**: es una falla *esperada* (`test.fail()`), así
que Playwright la cuenta como superada y el resultado global es verde con **0 omitidas y 0
inestables**. El detalle está más abajo.

---

## Qué corre

| Prueba | Archivo | Qué afirma |
|---|---|---|
| `setup` | `tests/auth.setup.ts` | Inicia sesión **una sola vez** por la UI y guarda el estado en `.auth/user.json`. |
| `E2E-01` | `tests/e2e-01-flujo-negocio.spec.ts` | Seis valores de negocio: 10 filas por página sobre 12 medidores · búsqueda `M-109` → 1 fila · consumo `2.207,6 kWh` · variación `+109,8 %` · estado `Crítica` en el detalle · orden de prioridad `M-109, M-112, M-104, M-106`. |
| `E2E-02` | `tests/e2e-02-bug-06-zona-horaria.spec.ts` | El defecto **BUG-06**, en `test.fail()`. |
| `E2E-03` | `tests/e2e-03-api-contrato.spec.ts` | Contrato por nginx: `401` sin token · `400` con `size: 101` y `errors[]` · página 2 con `count: 12` y 2 filas. |

`E2E-01` **no inicia sesión**: reutiliza el estado del proyecto `setup` vía `storageState`
(E2E-2). Ninguna prueba de `tests/` hace su propio login.

---

## El test del defecto (`test.fail()`)

`tests/e2e-02-bug-06-zona-horaria.spec.ts` guarda **BUG-06**: `formatPlantTime`
(`frontend/src/lib/format.ts:55-58`) documenta "se leen las partes UTC para NO convertirla a la
zona del navegador" pero usa `getDate()/getHours()/getMinutes()` —partes locales—. Con
`timezoneId: 'America/Bogota'` (UTC−5) la lectura de M-109 (`2026-09-12T14:00:00Z`) se muestra
5 h antes, contra `backend/README.md:28`.

La falla es **real y atribuida**. El reportero `list` oculta el motivo de una falla esperada, así
que para leerlo:

```bash
pnpm exec playwright test --reporter=json \
  | jq -r '[.. | objects | select(.error?.message) | .error.message] | .[]' \
  | sed $'s/\x1b\\[[0-9;]*m//g' \
  | grep -E 'Expected:|Received:'
```

Salida real:

```text
Expected: "12/09 14:00"
Received: "12/09 09:00"
```

Ese par es el defecto: el valor esperado es la hora de planta del oráculo y el obtenido es la
misma hora leída en la zona del navegador. **No hay `try/catch` ni guarda condicional**: el test
afirma siempre, y el día que `format.ts:57` use `getUTCHours()` la aserción pasará, `test.fail()`
la reportará como *unexpectedly passed* y la corrida quedará en rojo. Eso es el detector.

### Artefactos ante fallo

La configuración retiene `trace`, `video` y captura ante fallo. Como el test está en
`test.fail()`, la falla es *esperada* y Playwright **no** conservaría los artefactos
(`retain-on-failure` conserva solo cuando `status !== expectedStatus`), así que ese archivo pide
grabación explícita (`test.use({ trace: 'on', video: 'on', screenshot: 'on' })`). Resultado real
en `test-results/`:

```text
test-results/e2e-02-bug-06-zona-horaria-.../trace.zip
test-results/e2e-02-bug-06-zona-horaria-.../video.webm
test-results/e2e-02-bug-06-zona-horaria-.../test-finished-1.png
test-results/e2e-02-bug-06-zona-horaria-.../error-context.md
```

```bash
pnpm exec playwright show-trace test-results/e2e-02-*/trace.zip
```

### La rama que no se eligió

El respaldo era **BUG-03** (el falso positivo M-106 clasificado como `ALERT`, así que el filtro
"Normales" no lo muestra, contra `backend/README.md:105`). Se descartó por un criterio, no por
tiempo: la salida de BUG-06 **contiene la prueba numérica del defecto** (`Expected "12/09 14:00"`
/ `Received "12/09 09:00"`), que es exactamente la atribución que un revisor puede leer; la falla
de BUG-03 es una *ausencia* —la fila simplemente no está— y atribuye el defecto menos
visiblemente. Se envía **un solo** `test.fail()`: dos detectores condicionales independientes
enturbian la señal.

---

## Decisiones de configuración

| Clave | Valor | Por qué |
|---|---|---|
| `baseURL` | `http://localhost:3000` | Es la topología que se entrega (nginx sirve la SPA y proxya `/api/`). Contra `:8080` no hay UI; contra `:5173` se prueba un proxy de desarrollo que el producto no publica. |
| `retries` | `0` | Un verde comprado con reintentos esconde justo lo que se evalúa. Si una prueba es inestable, se arregla la prueba. |
| `workers` / `fullyParallel` | `1` / `false` | La suite comparte un único estado autenticado; serializar elimina fallas por orden. |
| `timezoneId` | `America/Bogota` | Hora de planta. Es la carga útil de `E2E-02`. |
| `locale` | `es-CO` | El producto formatea en es-CO (`2.207,6 kWh`, `+109,8 %`); fijarlo quita una clase de fallas falsas. |
| `viewport` | `1440×900` | El valor por defecto (1280×720) cae justo sobre el breakpoint `xl`, y dos celdas de fecha están condicionadas por breakpoint. |
| `trace` / `video` / `screenshot` | `retain-on-failure` | Traza, video y captura quedan en `test-results/` cuando algo falla de verdad. |

### Sin CI: decisión deliberada

No hay workflow de GitHub Actions para esta suite. Es un **trade-off explícito**: el repositorio
es una evaluación técnica con la aplicación levantada a mano por Docker Compose, y un pipeline
tendría que reconstruir ese entorno para correr contra él. El valor de un badge no compensa
duplicar el arranque del entorno; la reproducibilidad se cubre con el comando único de arriba.

### Respaldo documentado: `channel: 'chrome'`

Si la descarga de Chromium fallara (red corporativa, proxy), la alternativa es usar el Chrome
instalado en el sistema cambiando en `playwright.config.ts` el `use` de cada proyecto a
`channel: 'chrome'`. **No fue necesario**: la instalación fijada por `@playwright/test@1.64.1`
resolvió con éxito, así que esta contingencia **no se ejecutó** y no se presenta como evidencia.

---

## Disciplina de localizadores

- Solo `getByRole`, `getByLabel` y `getByText`. Cero selectores por posición y cero rutas
  CSS/XPath frágiles.
- Cero esperas fijas: todas las aserciones son web-first (`toHaveText`, `toHaveCount`,
  `toBeVisible`) y reintentan solas.
- Las filas se distinguen por **semántica**, no por índice: una fila de datos es la que contiene
  un `rowheader` (la celda `<th scope="row">` del medidor).
- La navegación y los localizadores viven en `pages/` y `fixtures/`, nunca dentro de las pruebas.

Comprobación:

```bash
grep -rE 'waitForTimeout|nth\(|nth-child|xpath=' tests pages   # sin coincidencias
```

---

## Desviaciones registradas

1. **`E2E-03` se incluyó (no se cortó).** El plan lo marcaba como candidato de corte para una
   corrida de un solo día; se llegó al checkpoint con holgura y el archivo quedó escrito y verde,
   así que no hay omisión que registrar. Si se hubiera cortado, la omisión se habría anotado aquí.
2. **`typescript` como segunda dependencia de desarrollo.** `@playwright/test` sigue siendo la
   única dependencia de ejecución; `typescript` está solo para poder verificar con
   `pnpm exec tsc --noEmit`. Playwright transpila por su cuenta, pero no trae el compilador.
3. **`tsconfig.json` sin `types: ["node"]`.** No se usa ningún módulo nativo de Node: la ruta del
   archivo de sesión se calcula con `new URL('../.auth/user.json', import.meta.url)` en
   `config/env.ts`, en un solo lugar, para que el proyecto `setup` escriba exactamente el archivo
   que el proyecto `chromium` lee. `skipLibCheck` queda en `true`.
4. **El consumo se afirma como par ordenado de celdas `kWh`.** La columna *Baseline* también
   termina en `kWh`, así que un filtro por unidad da dos coincidencias; se afirman juntas en forma
   de arreglo (Consumo, Baseline) en lugar de usar un índice.
5. **`exact: true` en `getByLabel`.** `getByLabel` busca por subcadena: `getByLabel('Medidor')`
   también alcanzaría al botón con `aria-label="Buscar medidor"`. Con `exact: true` se apunta al
   campo y se evita la ambigüedad.
6. **El sello de estado se ubica por vocabulario** (`/^(Normal|Alerta|Crítica)$/`), no por el valor
   esperado. Así una aserción fallida muestra el valor obtenido en vez de "elemento no
   encontrado".
7. **`test.use({ trace/video/screenshot: 'on' })` en `E2E-02`**, por la razón explicada en
   *Artefactos ante fallo*.

---

## Depurar

```bash
pnpm exec playwright test --ui                  # modo UI
pnpm exec playwright test e2e-01                # una prueba por nombre de archivo
pnpm exec playwright show-report                # informe HTML
pnpm exec playwright show-trace <trace.zip>     # traza de una corrida
```
