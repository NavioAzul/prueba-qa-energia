# Plan de pruebas · EnergIA

**Veredicto: NO-GO.** Bloquean la liberación **BUG-02, BUG-04 y BUG-06** (§ Veredicto). Este plan
documenta cómo se llegó a esa conclusión sobre el build `15765d9`.

**Alcance.** Cuatro frentes: humo, caja negra sobre API y UI, caja blanca de dos módulos del backend y
una suite Playwright de negocio, con un día de presupuesto y prioridad por riesgo.

**Fuera de alcance.** Carga, seguridad ofensiva, accesibilidad, matriz de navegadores (sólo Chromium),
integración continua y toda corrección del código: `backend/` y `frontend/` están congelados. Con 12
medidores y 14 días de lecturas, carga y seguridad ofensiva no darían conclusiones defendibles.

## Escala de severidad y prioridad

`S1` pérdida de datos, brecha o función crítica inutilizable · `S2` función importante incorrecta o
inalcanzable · `S3` menor o cosmético. `P1` bloquea la liberación · `P2` se corrige en el mismo ciclo ·
`P3` va al backlog.

La severidad mide impacto; la prioridad mide urgencia. BUG-01 es `S2` porque es el número que el
operador lee primero, y `P2` porque la pantalla sigue siendo usable.

## Riesgos priorizados

| ID | Riesgo | Impacto | Probabilidad | Mitigación o señal temprana |
|---|---|---|---|---|
| R1 | El motor clasifica o prioriza mal | Alto: la orden nace equivocada | Media | CN-09/CN-10/CN-11 contra `backend/README.md:17-22` |
| R2 | Calidad de datos tratada como anomalía real | Alto: se escala trabajo inexistente | Media | CN-09 y CN-11 comparan tipo y estado derivado |
| R3 | Autenticación o JWT con bypass | Alto: expone datos de planta | Baja | CN-01/CN-02/CN-03 y SM-03/SM-10, por nginx |
| R4 | Desplazamiento de zona horaria | Alto: se descarta la ventana del evento | Alta | CN-15 compara UI contra el ISO; E2E-02 lo automatiza |
| R5 | Divergencia entre contrato, API y UI | Medio: se ve algo distinto de lo documentado | Media | CN-07, CN-14, CN-16 y E2E-03 comparan las tres superficies |
| R6 | Paginación o filtros que ocultan datos | Alto: medidores inalcanzables | Alta | CN-04…CN-08, SM-05, SM-06 y E2E-01 |

## Tipos de prueba por capa

- **API**: negativas de autenticación, límites de paginación, tabla de decisión, transición de estado y
  consistencia entre capas, con `curl -i` contra `:8080` y token en tiempo de ejecución.
- **UI**: particiones de entrada en login y búsqueda, estado derivado, formato numérico y consistencia
  de fecha y orden, en Chromium 156 a 1440×900 con `TZ America/Bogota`.
- **Caja blanca**: lectura de rama en `internal/httpx` e `internal/meter`, cobertura ejecutada y
  veredicto de las suites existentes.
- **Automatización**: Playwright sobre `:3000`, `storageState` reutilizable, `retries: 0` y un test de
  defecto en `test.fail()`.

## Criterios de entrada y salida

Entrada: los tres servicios responden `200` y `docker compose ps` los muestra arriba; la imagen
corresponde a `15765d9` y no se reconstruye; el login demo devuelve token; existen `curl`, `jq`,
Chromium y `golang:1.26-alpine`.

Salida: humo ejecutado con veredicto y fallas conservadas; 18 casos de caja negra sin diferidos ni
`NA`; ningún `S1` abierto ni `S2/P1` abierto; dos veredictos de suite y tres tests propuestos fuera del
árbol de la aplicación.

## Matriz de trazabilidad

| Riesgo | Casos | Defecto | Caso o test que lo detecta |
|---|---|---|---|
| R1 | CN-09, CN-10, CN-11, CN-12 | BUG-01 | SM-04, CN-11 |
| R2 | CN-09, CN-11 | BUG-03 | CN-11 |
| R3 | CN-01, CN-02, CN-03, SM-03, SM-10 | — | sin defecto reproducido |
| R4 | CN-15, CN-18, E2E-02 | BUG-06 | CN-15, E2E-02 |
| R5 | CN-07, CN-14, CN-16, E2E-03 | BUG-05 | observación en el tablero; sin caso dedicado |
| R6 | CN-04…CN-08, SM-05, SM-06, E2E-01, E2E-03 | BUG-02, BUG-04 | SM-05 (BUG-02), CN-05 (BUG-04) |

Cinco defectos tienen detección formal. **BUG-05 sólo tiene observación y captura**: apareció al leer el
tablero en `SM-04`, fuera del criterio de ese check, y no se convirtió en caso para no alterar los 18 ya
ejecutados. Es una limitación declarada. CN-07 detectó una divergencia no promovida —la búsqueda
distingue mayúsculas contra el Swagger—, riesgo residual de R5.

## Resumen de ejecución

| Actividad | Planificado | Ejecutado | Resultado |
|---|---|---|---|
| Humo | 10 | 10 | 8 PASA / 2 FALLA |
| Caja negra | 18 | 18 | 14 PASA / 4 FALLA |
| Caja blanca | 2 módulos | 2 módulos | CB-01 y CB-02 |
| Defectos | 6 | 6 | todos reproducidos |
| Playwright | 2 tests + API | 3 specs + autenticación | 4 tests procesados, uno con falla esperada |

**Desviaciones.** `e2e-03` no se recortó: CP2 llegó con holgura y quedó verde. El humo se ejecutó con
Chromium automatizado y se contrastó con lectura manual de las mismas pantallas; las divergencias
coincidieron. `run.sh` usa `jq` para extraer el token y validar JSON sin imprimir credenciales:
dependencia explícita, verificada antes de la evidencia de API.

**Riesgo residual.** No se ejercieron `FAILED` ni el timeout de dos minutos; la búsqueda sensible a
mayúsculas afecta a quien escribe en minúsculas; BUG-05 no está automatizado ni tiene caso propio.

## Veredicto

**NO-GO.** Los tres bloqueadores son `S2/P1` y rompen criterios distintos: datos inalcanzables, error de
servidor ante entrada no confiable y marcas de tiempo desplazadas cinco horas. BUG-01, BUG-03 y BUG-05
no bloquean, pero deben corregirse en el mismo ciclo por compartir causa o contradecir la documentación.

El resto del build se sostiene —humo 8 de 10, caja negra 14 de 18— y los bloqueadores tienen causa
localizada: `Pagination.tsx:13`, `format.ts:57-58` frente a la función correcta de 51-63, y
`paging.go:23-36` y `:48`.

Podría pasar a **GO** sólo después de corregir los tres bloqueadores y repetir las pruebas afectadas.
Ese resultado no se asume antes de ejecutar la regresión.

## Integridad del árbol (INT-1)

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

Ambos en el HEAD de entrega: ninguna línea.
