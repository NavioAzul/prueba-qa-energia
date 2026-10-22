### CN-02 · `POST /meter/getAll` sin `Authorization`

- **Commit**: `15765d9` · **Fecha**: 2026-10-22 12:42 (America/Bogota)
- **Oráculo**: `backend/README.md` §Autenticación — las rutas de datos exigen token; el rechazo usa el sobre de error estándar con `401`.

#### Request

```http
POST /api/v1/meter/getAll HTTP/1.1
Host: localhost:8080
Content-Type: application/json

{
  "pagination": { "page": 1, "size": 10 }
}
```

```bash
curl -sS -i -X POST http://localhost:8080/api/v1/meter/getAll \
  -H 'Content-Type: application/json' \
  -d '{"pagination":{"page":1,"size":10}}'
```

#### Response

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json; charset=utf-8
Content-Length: 130
```

```json
{
  "status_code": 401,
  "message": "Falta el token de autenticación",
  "timestamp": "2026-10-22T17:42:00Z",
  "path": "/api/v1/meter/getAll"
}
```

#### Valores de negocio

```text
status_code=401
message=Falta el token de autenticación
```

#### Veredicto

`401` con el mensaje del contrato y sin datos de medidores en el cuerpo. Control negativo correcto: prueba que las validaciones de los casos siguientes se ejecutan sobre una ruta realmente protegida, no sobre una API abierta. **Coincide con el oráculo.**
