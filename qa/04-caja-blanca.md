# Caja blanca · EnergIA

**Alcance**: dos módulos del backend (`internal/httpx` e `internal/meter`) leídos a nivel de rama y
contrastados con las suites que ya existen en el repositorio, más el veredicto sobre la confiabilidad
de esas suites. Todo se ejecutó sobre el árbol congelado en `15765d9`; no se creó ni modificó ningún
archivo bajo `backend/` ni `frontend/`.

## 1. Método y comandos

El backend se ejecuta en un contenedor de un solo uso. La imagen de ejecución del proyecto es
distroless y no lleva Go, así que la suite **no** puede correr dentro del contenedor de la aplicación:

```bash
cd energy-ai
docker compose exec backend go test ./...
```

```text
OCI runtime exec failed: exec failed: unable to start container process: exec: "go": executable file not found in $PATH
```

La causa está en `backend/Dockerfile:12` (`FROM gcr.io/distroless/static-debian12:nonroot`): la etapa
de compilación (`backend/Dockerfile:2`) tiene el toolchain, la imagen final no. El comando válido es el
del contenedor de un solo uso con el código montado en lectura:

```bash
docker run --rm -e GOFLAGS=-mod=readonly -v "$PWD/backend:/src:ro" -w /src golang:1.26-alpine go test ./...
```

## 2. Suite del backend, ejecutada

Salida completa (código de salida 0):

```text
go: downloading github.com/golang-jwt/jwt/v5 v5.3.1
go: downloading golang.org/x/crypto v0.57.0
go: downloading github.com/swaggo/swag/v2 v2.0.0-rc6
go: downloading gopkg.in/yaml.v3 v3.0.1
go: downloading github.com/go-openapi/spec v0.20.9
go: downloading golang.org/x/tools v0.21.1-0.20240508182429-e35e4ccd0d2d
go: downloading github.com/sv-tools/openapi v0.4.0
go: downloading github.com/KyleBanks/depth v1.2.1
go: downloading github.com/go-openapi/jsonpointer v0.19.6
go: downloading github.com/go-openapi/swag v0.22.3
go: downloading github.com/go-openapi/jsonreference v0.20.2
go: downloading github.com/mailru/easyjson v0.7.7
go: downloading github.com/josharian/intern v1.0.0
?   	energyai/cmd/api	[no test files]
?   	energyai/cmd/inspect	[no test files]
?   	energyai/docs	[no test files]
ok  	energyai/internal/ai	0.175s
ok  	energyai/internal/analysis	0.195s
ok  	energyai/internal/analysis/baseline	0.075s
ok  	energyai/internal/analysis/changes	0.123s
ok  	energyai/internal/analysis/classify	0.030s
?   	energyai/internal/analysis/model	[no test files]
ok  	energyai/internal/analysis/quality	0.070s
ok  	energyai/internal/analysis/stats	0.007s
?   	energyai/internal/analysis/variables	[no test files]
?   	energyai/internal/anomaly	[no test files]
ok  	energyai/internal/auth	0.884s
ok  	energyai/internal/config	0.020s
?   	energyai/internal/dashboard	[no test files]
ok  	energyai/internal/data	0.047s
?   	energyai/internal/httpx	[no test files]
ok  	energyai/internal/meter	0.184s
ok  	energyai/internal/server	0.749s
?   	energyai/internal/store	[no test files]
?   	energyai/internal/testutil	[no test files]
```

Con `-v`, el mismo comando imprime **96 líneas `=== RUN`** (casos y subcasos). La suite pasa completa;
lo que sigue explica por qué eso no equivale a decir que el comportamiento es correcto.

## 3. Cobertura de sentencias

`-coverprofile` necesita escritura, así que se copió `backend/` a `/tmp` (nunca se escribió el perfil
dentro del repositorio) y se montó ese directorio en lectura/escritura:

```bash
cp -R backend /tmp/qa-backend-cov
docker run --rm -e GOFLAGS=-mod=readonly -v /tmp/qa-backend-cov:/src -w /src golang:1.26-alpine sh -c \
  'go test -coverprofile=/tmp/cov.out ./internal/httpx/... ./internal/meter/... ./internal/dashboard/... &&
   go tool cover -func=/tmp/cov.out'
```

```text
	energyai/internal/httpx		coverage: 0.0% of statements
ok  	energyai/internal/meter	0.205s	coverage: 79.6% of statements
	energyai/internal/dashboard		coverage: 0.0% of statements
--- cover -func ---
energyai/internal/dashboard/handler.go:15:	NewHandler		0.0%
energyai/internal/dashboard/handler.go:29:	GetSummary		0.0%
energyai/internal/dashboard/service.go:21:	NewService		0.0%
energyai/internal/dashboard/service.go:26:	Summary			0.0%
energyai/internal/httpx/middleware.go:14:	Chain			0.0%
energyai/internal/httpx/middleware.go:27:	WriteHeader		0.0%
energyai/internal/httpx/middleware.go:33:	Logger			0.0%
energyai/internal/httpx/middleware.go:48:	Recover			0.0%
energyai/internal/httpx/middleware.go:61:	CORS			0.0%
energyai/internal/httpx/paging.go:23:		Normalize		0.0%
energyai/internal/httpx/paging.go:47:		Paginate		0.0%
energyai/internal/httpx/paging.go:68:		SortOrderOptions	0.0%
energyai/internal/httpx/paging.go:76:		ParseSortOrder		0.0%
energyai/internal/httpx/request.go:17:		DecodeJSON		0.0%
energyai/internal/httpx/response.go:22:		WriteJSON		0.0%
energyai/internal/httpx/response.go:32:		WriteError		0.0%
energyai/internal/httpx/response.go:43:		NotFound		0.0%
energyai/internal/meter/dto.go:40:		Normalize		94.4%
energyai/internal/meter/enums.go:29:		StatusOf		100.0%
energyai/internal/meter/enums.go:60:		isOption		100.0%
energyai/internal/meter/handler.go:15:		NewHandler		0.0%
energyai/internal/meter/handler.go:29:		GetParams		0.0%
energyai/internal/meter/handler.go:48:		GetAll			0.0%
energyai/internal/meter/handler.go:74:		GetByID			0.0%
energyai/internal/meter/service.go:23:		NewService		100.0%
energyai/internal/meter/service.go:28:		Params			0.0%
energyai/internal/meter/service.go:43:		Summaries		100.0%
energyai/internal/meter/service.go:53:		GetAll			100.0%
energyai/internal/meter/service.go:73:		GetByID			100.0%
energyai/internal/meter/service.go:96:		summarize		100.0%
energyai/internal/meter/service.go:116:		sortSummaries		100.0%
energyai/internal/meter/service.go:137:		severityRank		100.0%
energyai/internal/meter/service.go:144:		metric			100.0%
energyai/internal/meter/service.go:152:		hourlyHistory		100.0%
energyai/internal/meter/service.go:168:		dailyHistory		100.0%
total:						(statements)		42.3%
```

Para localizar las ramas sin cubrir se generó la anotación HTML del mismo perfil
(`go tool cover -html`) y se leyeron las líneas marcadas sin cubrir. Esas líneas son las que se citan
en CB-01 y CB-02.

## 4. CB-01 · `internal/httpx` — 0.0 % de sentencias

El paquete que construye **todas** las respuestas de la API no tiene ningún archivo de test
(`energyai/internal/httpx [no test files]`). Su cobertura no es baja: es cero. Ramas sin cubrir,
enumeradas por archivo y línea:

| Función | Líneas sin cubrir | Rama que queda sin ejercitar |
|---|---|---|
| `Pagination.Normalize` (`backend/internal/httpx/paging.go:23`) | `backend/internal/httpx/paging.go:23-25` | `if p.Page == 0` → valor por defecto |
| | `backend/internal/httpx/paging.go:27-28` | `if p.Size == 0` → valor por defecto |
| | `backend/internal/httpx/paging.go:31-33` | `if p.Size < 1 \|\| p.Size > MaxPageSize` → error de validación |
| `Paginate` (`backend/internal/httpx/paging.go:47`) | `backend/internal/httpx/paging.go:47-55` | cálculo de `start`/`end`, página vacía y copia de filas |
| `SortOrderOptions` (`backend/internal/httpx/paging.go:68`) | `backend/internal/httpx/paging.go:68-72` | construcción de las dos opciones |
| `ParseSortOrder` (`backend/internal/httpx/paging.go:76`) | `backend/internal/httpx/paging.go:76,78,80,82` | casos `""`/`ASC`, `DESC` y `default` inválido |
| `DecodeJSON` (`backend/internal/httpx/request.go:17`) | `backend/internal/httpx/request.go:17-23,25-26` | body vacío (`io.EOF`), JSON inválido y campo desconocido |
| `WriteJSON` (`backend/internal/httpx/response.go:22`) | `backend/internal/httpx/response.go:22-27` | escritura y error de `Encode` |
| `WriteError` (`backend/internal/httpx/response.go:32`) | `backend/internal/httpx/response.go:32-39` | armado del `APIError` |
| `NotFound` (`backend/internal/httpx/response.go:43`) | `backend/internal/httpx/response.go:43-44` | 404 JSON |
| `Chain` (`backend/internal/httpx/middleware.go:14`) | `backend/internal/httpx/middleware.go:14-16` | composición de middlewares |
| `statusRecorder.WriteHeader` (`backend/internal/httpx/middleware.go:27`) | `backend/internal/httpx/middleware.go:27-29` | captura del status para el log |
| `Logger` (`backend/internal/httpx/middleware.go:33`) | `backend/internal/httpx/middleware.go:33-43` | línea de log por petición |
| `Recover` (`backend/internal/httpx/middleware.go:48`) | `backend/internal/httpx/middleware.go:48-53` | `recover()` + 500 genérico |
| `CORS` (`backend/internal/httpx/middleware.go:61`) | `backend/internal/httpx/middleware.go:61-71,74-76` | origen permitido y preflight `OPTIONS` |

Dos consecuencias concretas:

1. **`Normalize` valida `Size` y nunca `Page`.** La estructura declara `minimum:"1"` en
   `backend/internal/httpx/paging.go:18`, pero la única validación es la de `Size` (`backend/internal/httpx/paging.go:32`). Un `page` negativo cruza
   la validación y llega a `Paginate`.
2. **`Paginate` es la función que convierte esa entrada en un 500.** En `backend/internal/httpx/paging.go:48`,
   `start = min((Page-1)*Size, len(items))`; con `Page = -1` y `Size = 10` da `-20`, y `backend/internal/httpx/paging.go:54`
   corta `items[-20:-10]`, que entra en pánico. `Recover` (`backend/internal/httpx/middleware.go:48`) lo convierte en
   `500 «Error interno del servidor»`, que es exactamente lo que devuelve la API (BUG-04).

## 5. CB-02 · `internal/meter` — 79.6 % de sentencias

El paquete que deriva el estado que ve el operador está mejor cubierto, y esa es justamente la
lección. Cobertura por archivo, leída de la anotación HTML:

| Archivo | Cobertura | Líneas sin cubrir |
|---|---|---|
| `backend/internal/meter/enums.go` | **100.0 %** | ninguna |
| `backend/internal/meter/service.go` | 91.9 % | `backend/internal/meter/service.go:28-38` (`Params`, la única función del servicio sin test) |
| `backend/internal/meter/dto.go` | 94.4 % | `backend/internal/meter/dto.go:45-46` (error de `filter.meter_id` demasiado largo) |
| `backend/internal/meter/handler.go` | 0.0 % | `backend/internal/meter/handler.go:15-16,29-30,48-56,74-78` (los cuatro handlers HTTP) |

**El hallazgo con peso**: `StatusOf` (`backend/internal/meter/enums.go:29-38`) está al **100 % de cobertura de sentencias y
es incorrecto**:

```go
func StatusOf(a *model.Anomaly) Status {
	switch {
	case a == nil:                       // :31-32  cubierto
		return StatusNormal
	case a.Severity == model.SeverityHigh: // :33-34  cubierto
		return StatusCritical
	default:                             // :35-36  cubierto
		return StatusAlert
	}
}
```

Su propio comentario (`backend/internal/meter/enums.go:25-28`) promete «sin anomalía, o falso positivo (el motor dice "no
escalar"): NORMAL». La rama que implementaría esa promesa **no existe**: un `FALSE_POSITIVE` de
severidad `LOW` cae en `default` y se devuelve `ALERT`. Las tres ramas del `switch` están ejecutadas
por los tests, así que no hay una sola sentencia sin cubrir que delate el problema. Es la
demostración de que «la suite está en verde» y «el comportamiento es correcto» son afirmaciones
distintas: la cobertura de sentencias es **estructuralmente incapaz** de detectar una rama que
falta.

El mismo patrón aparece en `backend/internal/meter/dto.go:26`, que documenta la búsqueda como «coincidencia parcial y sin
importar mayúsculas», mientras `backend/internal/meter/service.go:59` compara con `strings.Contains(sm.MeterID, search)` sin
normalizar. La línea que debería normalizar no existe, y por eso el caso CN-07 encuentra 0 filas
donde el contrato promete 1. Se registra aquí como rama ausente (no como línea sin cubrir): ninguna
métrica de cobertura puede señalarla.

## 6. Por qué aquí no hay «porcentaje de ramas»

Go **no tiene cobertura de ramas nativa**. `-coverprofile` mide sentencias y `go tool cover` agrega
sentencias; no existe una cifra de ramas que `go test` pueda producir. Por eso este documento no
publica un porcentaje de ramas: sería un número inventado. La evidencia de rama es, en cambio, la
combinación de (a) las cifras `-func` de arriba y (b) las ramas sin cubrir enumeradas con
`archivo:línea` en las secciones 4 y 5, leídas de la anotación HTML generada por el mismo perfil.

## 7. Suite del frontend, ejecutada

```bash
cd frontend && pnpm test
```

```text
$ vitest run

 RUN  v5.0.1 /Users/calderonjosue_/energy-ai/frontend


 Test Files  3 passed (3)
      Tests  11 passed (11)
   Start at  13:17:05
   Duration  3.00s (environment 71%, setup 10%, transform 9%, import 6%, tests 4%)
```

## 8. Veredicto sobre las suites existentes

### Backend: **parcialmente confiable**

La suite pasa, pero **codifica un defecto como comportamiento esperado**. En
`backend/internal/server/server_test.go:131`:

```go
if counts["normal"] != float64(8) || counts["alert"] != float64(2) || counts["critical"] != float64(2) {
	t.Errorf("conteo por estado inesperado: %v", counts)
}
```

El oráculo del producto (`backend/README.md:24` y `:105`) exige `9 / 1 / 2`, porque M-106 es
`FALSE_POSITIVE` y debería contarse como normal. El test afirma `8 / 2 / 2`, así que **pasa
exactamente mientras el producto está mal** y fallaría si alguien corrigiera `StatusOf`. Es un candado
contra la corrección, no una red de seguridad.

Se puede confiar en esta suite para: enrutamiento, autenticación, detección y clasificación del motor,
y forma de las respuestas. **No** se puede confiar en ella para: cualquier valor derivado de
`StatusOf` (conteos por estado, filtros por estado, severidad mostrada).

### Frontend: **no confiable para comportamiento de fechas**

`frontend/src/lib/format.test.ts` existe y pasa. El problema es el mecanismo que lo hace pasar:
`frontend/vite.config.ts:33` fija `env: { TZ: 'UTC' }` para **todo** el entorno de Vitest. Las
aserciones sobre fechas se ejecutan en UTC mientras el producto corre en `America/Bogota`, así que
`formatPlantTime` (`frontend/src/lib/format.ts:55-58`) pasa en la suite y muestra 5 horas de menos en
producción. Citar sólo el archivo de test sería incompleto: el test no es débil por lo que afirma,
sino porque el entorno en el que corre no es el entorno en el que se usa el código.

Se puede confiar en esta suite para: funciones puras de formato numérico, parseo de filtros y
utilidades sin `Date`/`Intl`. **No** se puede confiar en ella para: nada que dependa de `Date`,
`Intl` o la zona horaria, incluida la hora de planta que el producto muestra en dos pantallas.

## 9. Propuestas de test unitario (snippets, no archivos)

Los siguientes tests **no se agregaron al repositorio**: `AGENTS.md` permite añadir tests, pero este
entregable trata `backend/` y `frontend/` como congelados por decisión de alcance (ver `INT-1`). Van
como código aquí, cada uno anotado con lo que afirma y por qué falla hoy.

### Propuesta 1 · `Paginate` con página negativa no debe entrar en pánico

```go
// CB-01 / BUG-04 — backend/internal/httpx/paging_test.go (propuesto)
func TestPaginateConPaginaNegativaNoEntraEnPanico(t *testing.T) {
	items := []string{"a", "b", "c"}
	got := Paginate(items, Pagination{Page: -1, Size: 10})

	if got.Page < 1 {
		t.Fatalf("Paginate devolvió page=%d; una página negativa debe normalizarse a 1", got.Page)
	}
	if got.Count != 3 || len(got.Rows) != 3 {
		t.Fatalf("Paginate devolvió count=%d y %d filas; esperaba 3 y 3", got.Count, len(got.Rows))
	}
}
```

**Qué afirma**: una página negativa se normaliza y el resultado conserva el total sin paginar.
**Por qué falla hoy**: `backend/internal/httpx/paging.go:48` calcula `start = min(-20, 3) = -20` y `backend/internal/httpx/paging.go:54` evalúa
`items[-20:-10]`; la función entra en pánico antes de devolver nada, y en la API ese pánico se
convierte en `500` (BUG-04).

### Propuesta 2 · `Normalize` debe rechazar `page: -1`

```go
// CB-01 / BUG-04 — backend/internal/httpx/paging_test.go (propuesto)
func TestNormalizeRechazaPaginaNegativa(t *testing.T) {
	p := Pagination{Page: -1, Size: 10}
	errs := p.Normalize()

	if len(errs) == 0 {
		t.Fatalf("Normalize aceptó page=%d; debe devolver un error de validación", p.Page)
	}
}
```

**Qué afirma**: la validación del body cubre `page` igual que cubre `size`.
**Por qué falla hoy**: `backend/internal/httpx/paging.go:23-35` sólo valida `Size`; con `page: -1` y `size: 10` devuelve una
lista de errores vacía y el valor negativo sigue de largo hasta `Paginate`. La estructura declara
`minimum:"1"` en `backend/internal/httpx/paging.go:18`, pero ningún código lo hace cumplir.

### Propuesta 3 · `StatusOf` debe devolver `NORMAL` para un falso positivo

```go
// CB-02 / BUG-01 y BUG-03 — backend/internal/meter/enums_test.go (propuesto)
func TestStatusOfFalsoPositivoEsNormal(t *testing.T) {
	fp := &model.Anomaly{Type: model.TypeFalsePositive, Severity: model.SeverityLow}
	if got := StatusOf(fp); got != StatusNormal {
		t.Fatalf("StatusOf(FALSE_POSITIVE, LOW) = %q; esperaba %q", got, StatusNormal)
	}

	if got := StatusOf(nil); got != StatusNormal {
		t.Fatalf("StatusOf(nil) = %q; esperaba %q", got, StatusNormal)
	}
}
```

**Qué afirma**: la primera línea del contrato documentado en `backend/internal/meter/enums.go:25-28` y en
`backend/README.md:105-107`.
**Por qué falla hoy**: `backend/internal/meter/enums.go:29-38` no tiene caso para `FALSE_POSITIVE`; el valor cae en
`default` y devuelve `ALERT`. Esta es la prueba de que el 100 % de cobertura de `StatusOf` no protege
nada: el test que falta no es un test de una línea existente, es el test de una rama inexistente.

### Propuesta 4 · `formatPlantTime` bajo la zona de la planta (Vitest)

```ts
// BUG-06 — frontend/src/lib/format.test.ts (propuesto, ampliación del archivo existente)
it('lee las partes UTC y no la zona del navegador', () => {
  expect(formatPlantTime('2026-09-12T14:00:00Z')).toBe('12/09 14:00')
})
```

**Qué afirma**: la hora de planta se lee en UTC, como declara el comentario de `frontend/src/lib/format.ts:51-52`.
**Por qué no falla hoy y sí en producción**: `frontend/src/lib/format.ts:57-58` usa `getDate()/getHours()/getMinutes()`
en vez de las variantes `getUTC*` que el mismo archivo usa en `:63`; el resultado correcto depende de
la zona del proceso. Con `env: { TZ: 'UTC' }` (`frontend/vite.config.ts:33`) el test pasa; ejecutado
bajo `TZ=America/Bogota` devuelve `12/09 09:00` y falla. La corrección del test es inseparable de la
corrección del entorno: sin quitar el pin de `TZ`, la aserción sigue siendo ciega.

## 10. Integridad

`git status --porcelain backend frontend` no reporta archivos antes ni después de este análisis: los
snippets de la sección 9 viven sólo en este documento. El perfil de cobertura se escribió en `/tmp`,
nunca dentro del repositorio.
