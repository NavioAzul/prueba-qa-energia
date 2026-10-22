### CN-04 · `pagination.size: 101` por encima del máximo

- **Commit**: `15765d9` · **Fecha**: 2026-10-22 12:42 (America/Bogota)
- **Oráculo**: `backend/internal/httpx/paging.go:19` declara `maximum:"100"`; Swagger publica el mismo límite y el sobre de error estándar devuelve `400` con `errors[]`.

#### Request

```http
POST /api/v1/meter/getAll HTTP/1.1
Host: localhost:8080
Authorization: Bearer <token>
Content-Type: application/json

{
  "pagination": { "page": 1, "size": 101 }
}
```

```bash
curl -sS -i -X POST http://localhost:8080/api/v1/meter/getAll \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"pagination":{"page":1,"size":101}}'
```

#### Response

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8
Content-Length: 170
```

```json
{
  "status_code": 400,
  "message": "Filtros inválidos",
  "errors": ["pagination.size debe estar entre 1 y 100"],
  "timestamp": "2026-10-22T17:42:00Z",
  "path": "/api/v1/meter/getAll"
}
```

#### Valores de negocio

```text
status_code=400
errors=pagination.size debe estar entre 1 y 100
```

#### Veredicto

`400` con el error de validación esperado. Este caso prueba que la validación negativa **sí existe** para `size`; el contraste con `BUG-04_page-negativo-500.md` demuestra que la ausencia de validación de `page` es una omisión puntual y no una decisión de diseño de toda la capa. **Coincide con el oráculo.**
