# Entrega QA · Prueba técnica (EnergIA)

> Última actualización: **Oct 22 2026**
>
> **Entrega: 2 días calendario.** Recibida Oct 20 → **vence Oct 22**.
>
> **Estado: entrega completa, a falta del video.** `qa/01…05`, `qa/evidencias/` y `e2e/` están
> entregados y ejecutados; el único ítem abierto es grabar el video y pegar su enlace (fila 9).

---

## Entregables — checklist de aceptación

| # | Entregable | Estado | Evidencia |
|---|---|---|---|
| 1 | Plan de pruebas con resumen ejecutivo y veredicto | [x] | `qa/01-plan-de-pruebas.md` |
| 2 | Smoke con justificación por caso | [x] | `qa/02-smoke.md` |
| 3 | 18 casos de caja negra (10 API / 8 UI) | [x] | `qa/03-casos-caja-negra.md` |
| 4 | Caja blanca de dos módulos y veredicto de las suites | [x] | `qa/04-caja-blanca.md` |
| 5 | Seis defectos confirmados con causa raíz | [x] | `qa/05-defectos.md` |
| 6 | Evidencias (12 archivos indexados) | [x] | `qa/evidencias/README.md` |
| 7 | README de la suite E2E con un solo comando | [x] | `e2e/README.md` |
| 8 | Suite Playwright: 4 verdes, 1 falla esperada | [x] | `e2e/playwright.config.ts` · `e2e/tests/` |
| 9 | **Video (≤15 min)** | [ ] **PENDIENTE — único ítem abierto** | enlace por pegar en `README.md` § Entrega QA |
| 10 | README de entrega con declaración de uso de IA | [x] | `README.md` § Entrega QA |

---

## Defectos — matriz conciliada con `qa/05-defectos.md`

| Defecto | S / P | Detección | Evidencia |
|---|---|---|---|
| BUG-01 · El tablero cuenta como alerta un falso positivo (`8/2/2` frente a `9/1/2`) | S2 / P2 | SM-04 · CN-11 | `qa/evidencias/api/BUG-01_status-counts.md` · `qa/evidencias/BUG-01_status-counts-dashboard.png` |
| BUG-02 · La paginación del libro no tiene página 2 (M-111/M-112 inalcanzables) | S2 / P1 | SM-05 · E2E-01 | `qa/evidencias/BUG-02_paginacion-sin-pagina-2.png` |
| BUG-03 · El filtro «Normales» esconde el falso positivo M-106 | S3 / P2 | CN-11 | `qa/evidencias/api/BUG-03_falso-positivo-fuera-de-normales.md` · `qa/evidencias/BUG-03_falso-positivo-fuera-de-normales.png` |
| BUG-04 · `page: -1` produce un 500 en lugar de un 400 | S2 / P1 | CN-05 | `qa/evidencias/api/BUG-04_page-negativo-500.md` |
| BUG-05 · «3 órdenes abiertas» sobre cuatro tarjetas renderizadas | S3 / P3 | SM-04 (observación directa, no asertada) | `qa/evidencias/BUG-05_ordenes-abiertas-vs-tarjetas.png` |
| BUG-06 · La hora de planta se muestra en la zona del navegador (`12/09 09:00` frente a `12/09 14:00`) | S2 / P1 | CN-15 · E2E-02 | `qa/evidencias/BUG-06_hora-de-planta-desfasada.png` · `e2e/tests/e2e-02-bug-06-zona-horaria.spec.ts` |

Los IDs `SM-` y `CN-` de esta matriz se resuelven en `qa/02-smoke.md` y `qa/03-casos-caja-negra.md`;
este tablero no define casos propios.

---

## Video y cierre

> **Enlace de video: PENDIENTE — enlace de video.**
> El video no está grabado todavía. Es el único entregable abierto; no se declara duración hasta
> tenerlo. Cuando exista, el enlace se pega en esta línea y en `README.md` § Entrega QA, y se
> verifica que abra.

**Guion de grabación (objetivo ≤10 min; techo duro 15 min).** Grabar en este orden, sin edición;
cada bloque usa evidencia ya commiteada.

| Orden | Qué mostrar | Tiempo objetivo | Evidencia |
|---|---|---|---|
| 1 | Estrategia: alcance, riesgos R1–R6 y por qué el veredicto es NO-GO | 1,5 min | `qa/01-plan-de-pruebas.md` |
| 2 | Tablero: BUG-01 en vivo, `8 normales · 2 alerta · 2 críticas` frente a `9/1/2` | 1,5 min | `qa/evidencias/BUG-01_status-counts-dashboard.png` |
| 3 | Libro de medidores: BUG-02, `1–10 de 12` con `Siguiente` deshabilitado y M-111/M-112 inalcanzables | 1,5 min | `qa/evidencias/BUG-02_paginacion-sin-pagina-2.png` |
| 4 | Anomalías: BUG-06, «Detectada» `12/09 09:00` frente a `12/09 14:00` | 1,5 min | `qa/evidencias/BUG-06_hora-de-planta-desfasada.png` |
| 5 | API con curl: BUG-04, `pagination.page = -1` → `HTTP/1.1 500` donde se espera `400` | 1 min | `qa/evidencias/api/BUG-04_page-negativo-500.md` |
| 6 | Playwright: `cd e2e && pnpm exec playwright test` → `4 passed` con 1 falla esperada | 2 min | `e2e/README.md` |
| 7 | Cierre: bloqueadores BUG-02/04/06, riesgo residual y qué falta corregir | 1 min | `qa/01-plan-de-pruebas.md` § Veredicto |

---

## Bitácora

| Fecha | Qué se hizo | Evidencia |
|---|---|---|
| Oct 22 | Tablero reescrito como estado de entrega: seis defectos conciliados con `qa/05-defectos.md`, diez aceptaciones con su evidencia y guion de grabación de ≤10 min. Único ítem abierto: el video. | este archivo · `qa/05-defectos.md` |
