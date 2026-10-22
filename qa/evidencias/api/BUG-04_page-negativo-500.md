### BUG-04 · `page: -1` produce un 500 en lugar de un 400

- **Commit**: `15765d9` · **Fecha**: 2026-10-22 12:42 (America/Bogota)
- **Oráculo**: el DTO declara `minimum:"1"` en `page` (`backend/internal/httpx/paging.go:18`) y Swagger publica ese contrato; la regla de entrada negativa exige `400` con errores de validación, nunca `500`.

#### Request

```http
POST /api/v1/meter/getAll HTTP/1.1
Host: localhost:8080
Authorization: Bearer <token>
Content-Type: application/json

{
  "pagination": { "page": -1, "size": 10 }
}
```

```bash
curl -sS -i -X POST http://localhost:8080/api/v1/meter/getAll \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"pagination":{"page":-1,"size":10}}'
```

#### Response

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json; charset=utf-8
Content-Length: 124
```

```json
{
  "status_code": 500,
  "message": "Error interno del servidor",
  "timestamp": "2026-10-22T17:42:00Z",
  "path": "/api/v1/meter/getAll"
}
```

#### Valores de negocio

```text
status_code=500  message=Error interno del servidor
```

#### Veredicto

`HTTP/1.1 500` ante una entrada negativa que el propio contrato declara inválida con `minimum:"1"`. La validación de `size` sí existe (ver `CN-04_pageSize-101.md`, `400` con `errors[]`), pero la de `page` no: `Normalize` sólo revisa `Size` (`backend/internal/httpx/paging.go:23-36`) y `Paginate` calcula `start = min((page-1)*size, len)` (`:48`), que con `page = -1` es `-20` y provoca un índice negativo. `httpx.Recover` convierte el pánico en `500` (`backend/internal/httpx/middleware.go:48-53`) → **BUG-04**.

`bash qa/evidencias/run.sh BUG-04` termina con código **1** e imprime `HTTP/1.1 500`; el caso pasará a verde cuando la API responda `400`.
