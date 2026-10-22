### CN-13 · Segundo disparo mientras el análisis sigue en curso

- **Commit**: `15765d9` · **Fecha**: 2026-10-22 12:42 (America/Bogota)
- **Oráculo**: `backend/README.md` §Run AI Analysis y `backend/internal/ai/handler.go:34-37` — la invariante es que **nunca corre un segundo análisis concurrente**: el disparo que encuentra el job en curso responde con **el mismo** run. El reparto entre `202` (el disparo que abre el run) y `200` (los que lo encuentran corriendo) depende del timing y varía entre corridas.

#### Request

```http
POST /api/v1/ai/analyze HTTP/1.1
Host: localhost:8080
Authorization: Bearer <token>
```

```bash
# Seis disparos simultáneos: el análisis dura ~40 ms, así que el solapamiento
# se fuerza con peticiones en paralelo.
for i in 1 2 3 4 5 6; do
  curl -sS -i -X POST http://localhost:8080/api/v1/ai/analyze \
    -H "Authorization: Bearer $TOKEN" &
done
wait
```

#### Response

Disparo aceptado (`202`):

```http
HTTP/1.1 202 Accepted
Content-Type: application/json; charset=utf-8
```

```json
{
  "id": "AN-0006",
  "status": "RUNNING",
  "trigger": "MANUAL",
  "narrator": "engine",
  "started_at": "2026-10-22T17:42:00.30416642Z",
  "finished_at": null,
  "duration_ms": 0,
  "summary": null
}
```

Disparo concurrente (`200`, mismo id, estado en curso):

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
```

```json
{
  "id": "AN-0006",
  "status": "RUNNING",
  "trigger": "MANUAL",
  "narrator": "engine",
  "steps": [
    { "key": "readings", "label": "Lecturas", "status": "DONE", "detail": "4.032 lecturas · 12 medidores" },
    { "key": "baseline", "label": "Baseline", "status": "RUNNING", "detail": "" },
    { "key": "detection", "label": "Detección", "status": "PENDING", "detail": "" }
  ]
}
```

#### Valores de negocio

```text
disparo 1: HTTP 200 · id=AN-0006
disparo 2: HTTP 200 · id=AN-0006
disparo 3: HTTP 200 · id=AN-0006
disparo 4: HTTP 200 · id=AN-0006
disparo 5: HTTP 202 · id=AN-0006
disparo 6: HTTP 200 · id=AN-0006
ids con 202: AN-0006
ids con 200: AN-0006 AN-0006 AN-0006 AN-0006 AN-0006
```

El orden de las respuestas varía entre ejecuciones; lo relevante es que **un solo id** aparece tanto en el `202` como en los `200`.

#### Veredicto

Las seis respuestas comparten `AN-0006`: no se creó un segundo análisis y el contrato de idempotencia se cumple. El reparto `202`/`200` de esta corrida es una muestra sujeta al timing; la invariante —un solo run, nunca dos concurrentes— es la que coincide con el oráculo.
