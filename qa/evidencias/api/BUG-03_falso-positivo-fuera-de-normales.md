### BUG-03 · El filtro "Normales" esconde el falso positivo M-106

- **Commit**: `15765d9` · **Fecha**: 2026-10-22 12:42 (America/Bogota)
- **Oráculo**: `backend/README.md:105` — "Sin anomalía, o `FALSE_POSITIVE` → `NORMAL`". Con 12 medidores, 2 `CRITICAL` (M-109, M-112) y 1 `ALERT` (M-104), el estado `NORMAL` debe contener 9 medidores, incluido M-106.

#### Request

```http
POST /api/v1/meter/getAll HTTP/1.1
Host: localhost:8080
Authorization: Bearer <token>
Content-Type: application/json

{
  "pagination": { "page": 1, "size": 10 },
  "filter": { "status": "NORMAL" }
}
```

```bash
curl -sS -i -X POST http://localhost:8080/api/v1/meter/getAll \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"pagination":{"page":1,"size":10},"filter":{"status":"NORMAL"}}'
```

#### Response

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
```

```json
{
  "page": 1,
  "size": 10,
  "count": 8,
  "rows": [
    { "meter_id": "M-101", "status": "NORMAL", "severity": null, "anomaly_type": null, "priority": null, "consumption_kwh": 728.79, "baseline_kwh": 729.61, "variation_pct": -0.11, "last_reading_at": "2026-09-14T23:00:00Z" },
    { "meter_id": "M-102", "status": "NORMAL", "severity": null, "anomaly_type": null, "priority": null, "consumption_kwh": 1012.85, "baseline_kwh": 1005.61, "variation_pct": 0.72, "last_reading_at": "2026-09-14T23:00:00Z" },
    { "meter_id": "M-103", "status": "NORMAL", "severity": null, "anomaly_type": null, "priority": null, "consumption_kwh": 602.39, "baseline_kwh": 594.99, "variation_pct": 1.24, "last_reading_at": "2026-09-14T23:00:00Z" },
    { "meter_id": "M-105", "status": "NORMAL", "severity": null, "anomaly_type": null, "priority": null, "consumption_kwh": 861.31, "baseline_kwh": 871.18, "variation_pct": -1.13, "last_reading_at": "2026-09-14T23:00:00Z" },
    { "meter_id": "M-107", "status": "NORMAL", "severity": null, "anomaly_type": null, "priority": null, "consumption_kwh": 474.66, "baseline_kwh": 479.04, "variation_pct": -0.91, "last_reading_at": "2026-09-14T23:00:00Z" },
    { "meter_id": "M-108", "status": "NORMAL", "severity": null, "anomaly_type": null, "priority": null, "consumption_kwh": 1211.49, "baseline_kwh": 1213.32, "variation_pct": -0.15, "last_reading_at": "2026-09-14T23:00:00Z" },
    { "meter_id": "M-110", "status": "NORMAL", "severity": null, "anomaly_type": null, "priority": null, "consumption_kwh": 706.16, "baseline_kwh": 706.84, "variation_pct": -0.1, "last_reading_at": "2026-09-14T23:00:00Z" },
    { "meter_id": "M-111", "status": "NORMAL", "severity": null, "anomaly_type": null, "priority": null, "consumption_kwh": 946.72, "baseline_kwh": 940.32, "variation_pct": 0.68, "last_reading_at": "2026-09-14T23:00:00Z" }
  ]
}
```

#### Valores de negocio

```text
count=8
rows=M-101,M-102,M-103,M-105,M-107,M-108,M-110,M-111
M-106 presente: no
```

#### Veredicto

`200` con `count: 8` y sin M-106. El falso positivo quedó clasificado como `ALERT` y desaparece de la pestaña `Normales` de la UI, contra `backend/README.md:105` → **BUG-03**. Es un defecto distinto de BUG-01 aunque comparta causa raíz: otro síntoma, otra pantalla y otro oráculo. `run.sh BUG-03` sale con código 1 mientras exista.
