#!/usr/bin/env bash
# Regenera los curls reproducibles de qa/evidencias/api/.
#
#   bash qa/evidencias/run.sh            # todos los casos
#   bash qa/evidencias/run.sh BUG-04     # un solo caso
#
# El token se pide en tiempo de ejecución y vive sólo en la variable TOKEN;
# este archivo no contiene ninguna credencial literal. No se usa `set -x`
# justamente para no volcar el token en la salida.
#
# Convención de salida: los casos BUG-0X comparan contra el CONTRATO, no contra
# el comportamiento actual. Mientras el defecto exista el script termina con
# código distinto de cero y con la divergencia impresa; cuando el defecto se
# corrija, el mismo caso pasa a verde sin tocar el script.
set -euo pipefail

BASE="${BASE:-http://localhost:8080}"   # API directo: la evidencia quiere el contrato crudo
API="$BASE/api/v1"
CASE="${1:-ALL}"

TOKEN="$(
  curl -sS -X POST "$API/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@energia.local","password":"admin123"}' \
    | jq -r '.access_token'
)"

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "ERROR: no se pudo obtener el token de la cuenta demo" >&2
  exit 1
fi

fail=0

status_of() { printf '%s' "$1" | head -n 1 | tr -d '\r' | awk '{print $2}'; }
body_of() { printf '%s' "$1" | tr -d '\r' | sed '1,/^$/d'; }

# Marca el caso como fallido cuando la observación no coincide con el contrato.
diverged() {
  fail=1
  echo "  -> DESVÍO: $*" >&2
}

aligned() { echo "  -> coincide con el contrato: $*"; }

want() { [ "$CASE" = "ALL" ] || [ "$CASE" = "$1" ]; }

# ---------------------------------------------------------------------------
# BUG-01 · GET /dashboard/getSummary
# Esperado (contrato): 200 y status_counts 9/1/2 — backend/README.md:24 (otros 8
# medidores sin alerta sobre 12) y backend/README.md:105 (FALSE_POSITIVE -> NORMAL).
# Obtenido hoy: 8/2/2. El caso falla a propósito mientras BUG-01 exista.
# ---------------------------------------------------------------------------
case_bug01() {
  local resp body normal alert critical
  echo
  echo "== BUG-01 · GET /dashboard/getSummary =="
  resp="$(curl -sS -i "$API/dashboard/getSummary" -H "Authorization: Bearer $TOKEN")"
  printf '%s\n' "$resp"
  [ "$(status_of "$resp")" = "200" ] || diverged "BUG-01 esperaba 200, obtuvo $(status_of "$resp")"

  body="$(body_of "$resp")"
  echo "  valores de negocio:"
  printf '%s' "$body" | jq -r '"  total_meters=\(.total_meters) normal=\(.status_counts.normal) alert=\(.status_counts.alert) critical=\(.status_counts.critical) anomalias=\(.anomalies_detected)"'

  normal="$(printf '%s' "$body" | jq -r '.status_counts.normal')"
  alert="$(printf '%s' "$body" | jq -r '.status_counts.alert')"
  critical="$(printf '%s' "$body" | jq -r '.status_counts.critical')"
  if [ "$normal" = "9" ] && [ "$alert" = "1" ] && [ "$critical" = "2" ]; then
    aligned "status_counts 9/1/2"
  else
    diverged "contrato 9/1/2, observado ${normal}/${alert}/${critical}"
  fi
}

# ---------------------------------------------------------------------------
# BUG-03 · POST /meter/getAll con filter.status = NORMAL
# Esperado (contrato): 200, count 9 e inclusión de M-106 (FALSE_POSITIVE -> NORMAL,
# backend/README.md:105). Obtenido hoy: 200, count 8, sin M-106.
# Falla a propósito mientras BUG-03 exista.
# ---------------------------------------------------------------------------
case_bug03() {
  local resp body count ids
  echo
  echo "== BUG-03 · POST /meter/getAll {filter.status: NORMAL} =="
  resp="$(curl -sS -i -X POST "$API/meter/getAll" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"pagination":{"page":1,"size":10},"filter":{"status":"NORMAL"}}')"
  printf '%s\n' "$resp"
  [ "$(status_of "$resp")" = "200" ] || diverged "BUG-03 esperaba 200, obtuvo $(status_of "$resp")"

  body="$(body_of "$resp")"
  count="$(printf '%s' "$body" | jq -r '.count')"
  ids="$(printf '%s' "$body" | jq -r '[.rows[].meter_id] | join(",")')"
  echo "  valores de negocio:"
  echo "  count=$count"
  echo "  rows=$ids"
  echo "  M-106 presente: $(printf '%s' "$ids" | grep -q 'M-106' && echo si || echo no)"

  if [ "$count" = "9" ] && printf '%s' "$ids" | grep -q 'M-106'; then
    aligned "count 9 con M-106"
  else
    diverged "contrato count=9 incluyendo M-106, observado count=$count rows=$ids"
  fi
}

# ---------------------------------------------------------------------------
# BUG-04 · POST /meter/getAll con pagination.page = -1
# Esperado (contrato): 400 con errores de validación — el tag del DTO declara
# minimum:"1" (backend/internal/httpx/paging.go:18), Swagger publica ese contrato
# y la regla de entradas negativas exige 400, nunca 500.
# Obtenido hoy: 500 "Error interno del servidor". Falla a propósito mientras exista.
# ---------------------------------------------------------------------------
case_bug04() {
  local resp code
  echo
  echo "== BUG-04 · POST /meter/getAll {pagination.page: -1} =="
  resp="$(curl -sS -i -X POST "$API/meter/getAll" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"pagination":{"page":-1,"size":10}}')"
  printf '%s\n' "$resp"

  code="$(status_of "$resp")"
  echo "  valores de negocio:"
  body_of "$resp" | jq -r '"  status_code=\(.status_code) message=\(.message)"'
  if [ "$code" = "400" ]; then
    aligned "400 ante entrada negativa"
  else
    diverged "contrato 400, observado $code"
  fi
}

# ---------------------------------------------------------------------------
# CN-02 · POST /meter/getAll sin Authorization
# Esperado: 401 y mensaje "Falta el token de autenticación". Coincide hoy.
# ---------------------------------------------------------------------------
case_cn02() {
  local resp code message
  echo
  echo "== CN-02 · POST /meter/getAll sin Authorization =="
  resp="$(curl -sS -i -X POST "$API/meter/getAll" \
    -H 'Content-Type: application/json' \
    -d '{"pagination":{"page":1,"size":10}}')"
  printf '%s\n' "$resp"

  code="$(status_of "$resp")"
  message="$(body_of "$resp" | jq -r '.message')"
  echo "  valores de negocio:"
  echo "  status_code=$code"
  echo "  message=$message"
  if [ "$code" = "401" ] && [ "$message" = "Falta el token de autenticación" ]; then
    aligned "401 + mensaje del contrato"
  else
    diverged "esperaba 401 con 'Falta el token de autenticación', observado $code / $message"
  fi
}

# ---------------------------------------------------------------------------
# CN-04 · POST /meter/getAll con pagination.size = 101
# Esperado: 400 con errors[] (límite superior del DTO: maximum:"100").
# Coincide hoy: prueba que la validación negativa existe para el tamaño.
# ---------------------------------------------------------------------------
case_cn04() {
  local resp code errors
  echo
  echo "== CN-04 · POST /meter/getAll {pagination.size: 101} =="
  resp="$(curl -sS -i -X POST "$API/meter/getAll" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"pagination":{"page":1,"size":101}}')"
  printf '%s\n' "$resp"

  code="$(status_of "$resp")"
  errors="$(body_of "$resp" | jq -r '.errors | join("; ")')"
  echo "  valores de negocio:"
  echo "  status_code=$code"
  echo "  errors=$errors"
  if [ "$code" = "400" ] && [ -n "$errors" ]; then
    aligned "400 con errors[]"
  else
    diverged "esperaba 400 con errors[], observado $code / $errors"
  fi
}

# ---------------------------------------------------------------------------
# CN-13 · Segundo disparo mientras el análisis sigue RUNNING
# Esperado: 202 para el primer disparo y 200 con el MISMO id para el disparo
# concurrente (backend/internal/ai/handler.go:34-37). Nunca dos jobs a la vez.
# Se lanzan varios curl en paralelo porque el análisis dura ~40 ms.
# ---------------------------------------------------------------------------
case_cn13() {
  local tmp i resp code id
  local ids202="" ids200="" ok=0
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' RETURN

  echo
  echo "== CN-13 · POST /ai/analyze concurrente (mientras RUNNING) =="
  for i in 1 2 3 4 5 6; do
    curl -sS -i -o "$tmp/resp$i.txt" -X POST "$API/ai/analyze" \
      -H "Authorization: Bearer $TOKEN" &
  done
  wait

  for i in 1 2 3 4 5 6; do
    resp="$(cat "$tmp/resp$i.txt")"
    code="$(status_of "$resp")"
    id="$(body_of "$resp" | jq -r '.id')"
    echo "  disparo $i: HTTP $code · id=$id"
    case "$code" in
      202) ids202="$ids202 $id" ;;
      200) ids200="$ids200 $id" ;;
    esac
  done

  echo "  valores de negocio:"
  echo "  ids con 202:$ids202"
  echo "  ids con 200:$ids200"

  if [ -z "$ids200" ] || [ -z "$ids202" ]; then
    diverged "no se observó a la vez un 202 y un 200 concurrente"
    return 0
  fi
  for id in $ids200; do
    if printf '%s' "$ids202" | tr ' ' '\n' | grep -qx "$id"; then
      ok=1
    else
      diverged "el 200 devolvió un id distinto ($id) del 202"
    fi
  done
  [ "$ok" = "1" ] && aligned "202 + 200 con el mismo id, sin segundo job"

  echo "  respuesta representativa del disparo concurrente:"
  for i in 1 2 3 4 5 6; do
    if [ "$(status_of "$(cat "$tmp/resp$i.txt")")" = "200" ]; then
      cat "$tmp/resp$i.txt"
      break
    fi
  done
}

want BUG-01 && case_bug01
want BUG-03 && case_bug03
want BUG-04 && case_bug04
want CN-02 && case_cn02
want CN-04 && case_cn04
want CN-13 && case_cn13

echo
if [ "$fail" -ne 0 ]; then
  echo "Resultado: hay desvíos respecto del contrato (ver líneas 'DESVÍO')." >&2
  exit 1
fi
echo "Resultado: todas las comprobaciones coinciden con el contrato."
