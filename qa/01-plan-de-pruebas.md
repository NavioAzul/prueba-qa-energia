# Plan de pruebas · EnergIA

**Alcance.** Verificar el build del SHA `15765d9` en cuatro frentes: humo de entorno, caja negra sobre
API y UI, caja blanca de dos módulos del backend y una suite Playwright de negocio. Este plan responde una
pregunta: si el build puede liberarse. Con un día de presupuesto, la prioridad se fija por riesgo.

**Fuera de alcance.** Carga, seguridad ofensiva, accesibilidad, matriz de navegadores (sólo
Chromium), integración continua y cualquier corrección del código: `backend/` y `frontend/` están
congelados y su integridad es condición de la entrega.

## Riesgos priorizados

| ID | Riesgo | Impacto | Probabilidad | Mitigación o señal temprana |
|---|---|---|---|---|
| R1 | El motor clasifica o prioriza mal | Alto: la orden que dirige al operador nace equivocada | Media | CN-09/CN-10/CN-11 contra `backend/README.md:17-22` |
| R2 | Calidad de datos tratada como anomalía real | Alto: se escala trabajo inexistente | Media | CN-09 y CN-11 comparan tipo y estado derivado |
| R3 | Autenticación o JWT con bypass | Alto: expone datos de planta | Baja | CN-01/CN-02/CN-03 y SM-03/SM-10, siempre por nginx |
| R4 | Desplazamiento de zona horaria | Alto: se descarta la ventana correcta del evento | Alta | CN-15 compara UI contra el ISO de la API; E2E-02 lo automatiza |
| R5 | Divergencia entre contrato, API y UI | Medio: el operador ve algo distinto de lo documentado | Media | CN-07, CN-14, CN-16 y E2E-03 comparan las tres superficies |
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

## Criterios de entrada

1. Los tres servicios responden `200` y `docker compose ps` los muestra arriba.
2. La imagen en ejecución corresponde a `15765d9` y no se reconstruye durante la corrida.
3. El login demo devuelve token y la UI autenticada renderiza.
4. Existen `curl`, `jq`, Chromium de Playwright y `golang:1.26-alpine`.

## Criterios de salida

1. Humo ejecutado con veredicto explícito y fallas conservadas.
2. 18 casos de caja negra ejecutados, sin `pendiente` ni `NA`.
3. Ningún defecto `S1` abierto y ningún `S2` con prioridad `P1` abierto.
4. Dos veredictos de suite emitidos y tres tests propuestos fuera del árbol de la aplicación.

## Matriz de trazabilidad

| Riesgo | Casos | Defecto | Caso o test que lo detecta |
|---|---|---|---|
| R1 | CN-09, CN-10, CN-11, CN-12 | BUG-01 | SM-04, CN-11 |
| R2 | CN-09, CN-11 | BUG-03 | CN-11 |
| R3 | CN-01, CN-02, CN-03, SM-03, SM-10 | — | sin defecto reproducido |
| R4 | CN-15, CN-18, E2E-02 | BUG-06 | CN-15, E2E-02 |
| R5 | CN-07, CN-14, CN-16, E2E-03 | BUG-05 | SM-04 (observación directa, no asertada) |
| R6 | CN-04…CN-08, SM-05, SM-06, E2E-01, E2E-03 | BUG-02, BUG-04 | SM-05 (BUG-02), CN-05 (BUG-04) |

Los seis defectos quedan cubiertos: cuatro por caja negra, BUG-02 por `SM-05` y BUG-05 por observación en
`SM-04`. CN-07 detectó además una divergencia no promovida —la búsqueda distingue mayúsculas contra el
Swagger— que queda como riesgo residual de R5.

## Resumen de ejecución

| Actividad | Planificado | Ejecutado | Resultado |
|---|---|---|---|
| Humo | 10 | 10 | 8 PASA / 2 FALLA |
| Caja negra | 18 | 18 | 14 PASA / 4 FALLA |
| Caja blanca | 2 módulos | 2 módulos | CB-01 y CB-02 |
| Defectos | 6 | 6 | todos reproducidos |
| Playwright | 2 tests + API | 3 archivos de spec | 4 tests verdes con 1 falla esperada |

**Desviaciones y su causa.** `e2e-03-api-contrato.spec.ts` **no se recortó**: CP2 llegó con holgura y
el test de contrato quedó verde; la suite entrega tres specs más el proyecto de autenticación. El humo se
ejecutó con navegador real automatizado desde `/tmp`, con resultados idénticos a una caminata manual.
`run.sh` usa `jq`, según la convención del repositorio. CN-07 falla por una divergencia observada aquí, no
promovida a defecto para no alterar el registro de seis.

**Riesgo residual.** No se ejercieron `FAILED` ni el timeout de dos minutos; la búsqueda sensible a mayúsculas afecta a quien
escribe en minúsculas; BUG-05 no tiene detección automática.

## Veredicto

**NO-GO.** Bloquean la liberación **BUG-02**, **BUG-04** y **BUG-06**: los tres son `S2/P1` y cada uno
rompe un criterio distinto — datos inalcanzables, error de servidor ante entrada no confiable y marcas
de tiempo desplazadas cinco horas. BUG-01, BUG-03 y BUG-05 no bloquean, pero deben corregirse en el
mismo ciclo por compartir causa o contradecir la documentación.

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

Ambos se ejecutaron en el HEAD de entrega y no reportan ninguna línea.
