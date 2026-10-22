# EnergIA · AI Energy Management Platform

> **¿Vienes a presentar la prueba técnica de QA?** Empieza por [PRUEBA_QA.md](PRUEBA_QA.md).

MVP para monitorear medidores eléctricos y usar IA para **detectar, explicar, priorizar y recomendar acciones** sobre anomalías de consumo.

Con 14 días de lecturas horarias de 12 medidores, la plataforma responde lo que necesita un operador: qué está pasando, qué se sale de lo normal, si la anomalía es real, explicable o un problema de calidad de datos, cuál revisar primero y qué hacer.

| Prioridad | Medidor | Resultado | Acción |
|---|---|---|---|
| 1 | M-109 | Anomalía real (+110,5 % sin evento que lo explique) | Investigar en sitio |
| 2 | M-112 | Calidad de datos (voltaje y factor de potencia incoherentes) | Validar el medidor |
| 3 | M-104 | Anomalía explicable (nueva línea productiva) | Actualizar baseline |
| 4 | M-106 | Falso positivo (parada programada) | No escalar |

## Proyecto

Este repo tiene dos aplicaciones y la configuración para correrlas juntas:

| Carpeta | Qué es | Documentación |
|---|---|---|
| [`backend/`](backend/) | API en Go: motor de detección de anomalías, login con JWT, Run AI Analysis y narrador opcional con OpenAI | [backend/README.md](backend/README.md): API, variables de entorno, metodología del motor y tests |
| [`frontend/`](frontend/) | Dashboard en React 19 + Vite + TanStack Query | [frontend/README.md](frontend/README.md): pantallas y arquitectura. El diseño está en [DESIGN.md](frontend/DESIGN.md) y el producto en [PRODUCT.md](frontend/PRODUCT.md) |

```
energy-ai/
├── .env.example         # plantilla de variables (copiar como .env)
├── docker-compose.yml   # backend + frontend
├── backend/             # API en Go (datos en backend/data/*.csv)
└── frontend/            # React, servido por nginx en Docker
```

## Configuración

Hay **un solo `.env`**, en la raíz del proyecto. Lo usan el backend, el frontend y `docker compose`:

```bash
cp .env.example .env
```

Todas las variables son opcionales y tienen un valor por defecto, así que la app arranca sin tocar nada. Las que conviene definir:

| Variable | Para qué |
|---|---|
| `OPENAI_API_KEY` | Si está, Run AI Analysis redacta las explicaciones con OpenAI. Si no, las escribe el motor |
| `JWT_SECRET` | Secreto de los tokens. **Cámbialo fuera de local** |
| `AUTH_EMAIL`, `AUTH_PASSWORD` | Usuario del login (por defecto `admin@energia.local` / `admin123`) |

La lista completa está en [backend/README.md](backend/README.md#variables-de-entorno). El `.env` está en `.gitignore` y nunca se sube al repo.

## Cómo correrlo

### Con Docker

Desde la raíz del proyecto:

```bash
docker compose up -d --build
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API (Swagger) | http://localhost:8080/docs |

nginx sirve el frontend y reenvía `/api` al backend, así que la app funciona desde cualquier IP sin configurar CORS. Para detenerla: `docker compose down`.

### En desarrollo

Se corre cada aplicación en su propia terminal. El frontend se recarga solo al guardar.

```bash
# Terminal 1: backend (Go 1.26+), en http://localhost:8080
cd backend
go run ./cmd/api

# Terminal 2: frontend (Node 20.19+ y pnpm), en http://localhost:5173
cd frontend
pnpm install
pnpm dev
```

El backend se corre desde `backend/`: ahí busca los CSV (`data/`) y el `.env` de la raíz (`../.env`). En desarrollo, Vite reenvía `/api` al backend.

## Despliegue en un servidor

En cualquier máquina con Docker (por ejemplo, una VM o un LXC de Proxmox):

```bash
git clone <url-del-repo> energy-ai
cd energy-ai
cp .env.example .env     # completa JWT_SECRET, AUTH_PASSWORD y OPENAI_API_KEY
docker compose up -d --build
```

Para actualizar: `git pull && docker compose up -d --build`.

El servidor construye las imágenes, así que no hace falta un registro como Docker Hub. Los CSV van dentro de la imagen del backend.

## Tests

```bash
# backend (sin Go en el host: ver § Tests del backend en contenedor)
cd backend
go test ./...

# frontend
cd frontend
pnpm test && pnpm lint && pnpm typecheck
```

El detalle de qué cubre cada suite está en el README de cada aplicación.

## Entrega QA

> **Video de la entrega: PENDIENTE — enlace de video.**
> El video todavía no está grabado, así que no se declara duración ni se inventa una URL. El guion de grabación (objetivo ≤10 min, techo 15) está en [`PENDIENTES.md`](PENDIENTES.md) § Video y cierre. Cuando exista, el enlace se pega en esta línea y en `PENDIENTES.md`, y se verifica que abra.

El informe completo está en [`qa/`](qa/): plan y resumen ejecutivo ([`qa/01-plan-de-pruebas.md`](qa/01-plan-de-pruebas.md)), smoke ([`qa/02-smoke.md`](qa/02-smoke.md)), 18 casos de caja negra ([`qa/03-casos-caja-negra.md`](qa/03-casos-caja-negra.md)), caja blanca ([`qa/04-caja-blanca.md`](qa/04-caja-blanca.md)), seis defectos confirmados ([`qa/05-defectos.md`](qa/05-defectos.md)) e índice de evidencias ([`qa/evidencias/README.md`](qa/evidencias/README.md)). La suite E2E vive en [`e2e/`](e2e/README.md).

**Veredicto: NO-GO.** Bloquean la liberación **BUG-02** (paginación sin página 2), **BUG-04** (`page: -1` → 500) y **BUG-06** (hora de planta desplazada 5 h); los tres son `S2/P1`. BUG-01, BUG-03 y BUG-05 no bloquean, pero deben corregirse en el mismo ciclo.

### Correr la suite E2E

Con la aplicación arriba (ver [Cómo correrlo](#cómo-correrlo)), un solo comando desde la raíz:

```bash
cd e2e && pnpm install && pnpm exec playwright install chromium && pnpm exec playwright test
```

Salida real capturada en esta entrega:

```text
Already up to date
Done in 910ms using pnpm v11.7.0

Running 4 tests using 1 worker

  ✓  1 [setup] › tests/auth.setup.ts:13:1 › iniciar sesión una vez y guardar el estado de sesión (1.8s)
  ✓  2 [chromium] › tests/e2e-01-flujo-negocio.spec.ts:14:1 › E2E-01 · el flujo de negocio muestra los valores de planta del medidor y el orden de las órdenes (2.5s)
  ✓  3 [chromium] › tests/e2e-03-api-contrato.spec.ts:15:1 › E2E-03 · el contrato de la API responde como está documentado (129ms)
  ✘  4 [chromium] › tests/e2e-02-bug-06-zona-horaria.spec.ts:34:1 › E2E-02 · la hora de planta de M-109 no se desplaza 5 h (8.7s)

  4 passed (17.6s)
```

El `✘` es el test de **BUG-06** marcado con `test.fail()`: la falla es real, está atribuida y Playwright la cuenta como superada. El resumen es `4 passed`, con **0 omitidas, 0 inestables y 1 falla esperada**.

### Tests del backend en contenedor

La imagen de ejecución del backend es distroless ([`backend/Dockerfile:12`](backend/Dockerfile)), así que **no contiene Go ni shell**: `docker compose exec backend go test ./...` (el comando que sugiere `AGENTS.md`) falla con `exec: "go": executable file not found in $PATH`. El comando que sí corre monta el código en un contenedor con toolchain:

```bash
docker run --rm -e GOFLAGS=-mod=readonly -v "$PWD/backend:/src:ro" -w /src golang:1.26-alpine go test ./...
```

Salida real (exit 0; las primeras líneas son la descarga de módulos en el contenedor efímero):

```text
go: downloading github.com/swaggo/swag/v2 v2.0.0-rc6
go: downloading github.com/golang-jwt/jwt/v5 v5.3.1
go: downloading golang.org/x/crypto v0.57.0
go: downloading github.com/sv-tools/openapi v0.4.0
go: downloading golang.org/x/tools v0.21.1-0.20240508182429-e35e4ccd0d2d
go: downloading github.com/KyleBanks/depth v1.2.1
go: downloading github.com/go-openapi/spec v0.20.9
go: downloading gopkg.in/yaml.v3 v3.0.1
go: downloading github.com/go-openapi/jsonpointer v0.19.6
go: downloading github.com/go-openapi/jsonreference v0.20.2
go: downloading github.com/go-openapi/swag v0.22.3
go: downloading github.com/mailru/easyjson v0.7.7
go: downloading github.com/josharian/intern v1.0.0
?   	energyai/cmd/api	[no test files]
?   	energyai/cmd/inspect	[no test files]
?   	energyai/docs	[no test files]
ok  	energyai/internal/ai	0.194s
ok  	energyai/internal/analysis	0.203s
ok  	energyai/internal/analysis/baseline	0.091s
ok  	energyai/internal/analysis/changes	0.156s
ok  	energyai/internal/analysis/classify	0.017s
?   	energyai/internal/analysis/model	[no test files]
ok  	energyai/internal/analysis/quality	0.131s
ok  	energyai/internal/analysis/stats	0.025s
?   	energyai/internal/analysis/variables	[no test files]
?   	energyai/internal/anomaly	[no test files]
ok  	energyai/internal/auth	1.240s
ok  	energyai/internal/config	0.043s
?   	energyai/internal/dashboard	[no test files]
ok  	energyai/internal/data	0.085s
?   	energyai/internal/httpx	[no test files]
ok  	energyai/internal/meter	0.172s
ok  	energyai/internal/server	1.117s
?   	energyai/internal/store	[no test files]
?   	energyai/internal/testutil	[no test files]
```

### Integridad del árbol de la aplicación

`backend/` y `frontend/` no se modificaron: siguen idénticos al SHA congelado `15765d9`. Los dos comandos se ejecutaron en esta sesión y no imprimen ninguna línea; este commit sólo toca documentación.

```bash
git diff 15765d9..HEAD --stat -- backend frontend
```

```text

```

```bash
git status --porcelain backend frontend
```

```text

```

El escaneo de secretos sobre los archivos versionados de `qa/`, `e2e/`, `README.md` y `PENDIENTES.md` no encontró cadenas con forma de JWT ni direcciones IP; el único correo presente es la cuenta demo `admin@energia.local` y las URLs apuntan a `localhost`. Ningún `.env` está versionado: `git ls-files` sólo devuelve `.env.example`.

### Declaración de uso de IA

Se usó un agente de IA (OpenCode) con modelos de lenguaje como par de ejecución, no como fuente de verdad. Reparto real del trabajo:

| Actividad | Qué hizo la IA | Cómo se verificó |
|---|---|---|
| Diseño de casos y riesgos | Propuso la matriz riesgo → caso y redactó los 18 casos `CN-01…CN-18` y los 10 smoke `SM-01…SM-10` | Cada `Obtenido` se ejecutó contra la app (`curl` o navegador real con `TZ America/Bogota`); los candidatos no reproducidos quedaron como hipótesis en `qa/05-defectos.md`, no como defectos |
| Redacción de documentos | Redactó `qa/01`…`qa/05`, `qa/evidencias/README.md` y esta sección a partir de la ejecución | Cada cifra, estado HTTP, rango y ruta se contrastó con la salida del comando o con el archivo citado; cada `archivo:línea` se abrió en el SHA `15765d9` |
| Scripts y automatización | Escribió `qa/evidencias/run.sh` y la suite `e2e/` (page objects, fixtures, tres specs) | Se ejecutaron de nuevo en esta sesión: Playwright terminó en `4 passed` con 1 falla esperada y el comando de tests del backend terminó con exit 0. Todos los comandos pegados en esta sección se ejecutaron antes de documentarlos |
| Causa raíz | Señaló `archivo:línea` probables (`enums.go`, `paging.go`, `Pagination.tsx`, `format.ts`) | Se leyó cada archivo en el SHA congelado y se comprobó que la rama descrita explicaba el síntoma observado; lo que no se pudo confirmar se declaró en «Hipótesis y divergencias no promovidas» |
| Video | **No** lo generó ni lo narró la IA | Queda pendiente de grabación humana; no se declara duración ni contenido no grabado |

Ningún hallazgo se reportó sin reproducción y ninguna cifra se copió de la documentación sin contrastarla con la aplicación. Lo que la IA no pudo verificar se declara como hipótesis o como limitación. La IA tampoco escribió fuera de `qa/`, `e2e/` y los dos documentos de entrega: la prueba de integridad de arriba lo demuestra.
