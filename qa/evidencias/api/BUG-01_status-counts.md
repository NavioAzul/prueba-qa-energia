### BUG-01 · El tablero cuenta como alerta un falso positivo

- **Commit**: `15765d9` · **Fecha**: 2026-10-22 12:42 (America/Bogota)
- **Oráculo**: `backend/README.md:24` ("Los otros 8 medidores no generan alertas", sobre 12 medidores y 4 anomalías) y `backend/README.md:105` (`FALSE_POSITIVE` → `NORMAL`). El medidor M-106 es `FALSE_POSITIVE` (`backend/README.md:22`).

#### Request

```http
GET /api/v1/dashboard/getSummary HTTP/1.1
Host: localhost:8080
Authorization: Bearer <token>
```

```bash
curl -sS -i http://localhost:8080/api/v1/dashboard/getSummary \
  -H "Authorization: Bearer $TOKEN"
```

#### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
```

```json
{
  "total_meters": 12,
  "status_counts": { "normal": 8, "alert": 2, "critical": 2 },
  "anomalies_detected": 4,
  "requiring_attention": 2,
  "ai_confidence": 0.9,
  "anomalies_by_type": {
    "DATA_QUALITY": 1,
    "EXPLAINABLE_ANOMALY": 1,
    "FALSE_POSITIVE": 1,
    "REAL_ANOMALY": 1
  }
}
```

*Extracto de los campos que sostienen la afirmación; el cuerpo completo (incluida `priorities`) se regenera con `bash qa/evidencias/run.sh BUG-01`.*

#### Valores de negocio

```text
total_meters=12  normal=8  alert=2  critical=2  anomalias=4
```

Reparto esperado por el oráculo: `normal=9` (8 medidores sin anomalía + M-106 falso positivo), `alert=1` (M-104, severidad `MEDIUM`), `critical=2` (M-109 y M-112, severidad `HIGH`).

#### Veredicto

`200` con `status_counts` `8/2/2`: el falso positivo M-106 se cuenta como alerta. Contradice `backend/README.md:24` y `:105` → **BUG-01**. El script `run.sh BUG-01` sale con código 1 mientras el desvío exista.
