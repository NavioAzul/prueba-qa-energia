# Evidencias de la suite QA · EnergIA

Este directorio concentra las pruebas reproducibles del informe: capturas de UI y pares
request/response de API. El índice al final del documento vincula cada archivo con el hallazgo
que demuestra (`BUG-0X` o `CN-0X`).

## 1. Línea base congelada

| Dato | Valor |
|---|---|
| SHA congelado de la aplicación | `15765d9` |
| HEAD de entrega al iniciar la ejecución | `22b4c85` |
| Fecha y hora de congelamiento | 2026-10-22 12:33 (America/Bogota, UTC−05:00) |
| Sistema operativo | macOS 26.5 (build 25F71), arm64 |
| Navegador de referencia | Chromium de Playwright · Chrome for Testing 156.0.8078.4 (build `chromium-1248`), viewport 1440×900 |
| Navegador alterno | Google Chrome 155.0.8059.85 (`/Applications/Google Chrome.app`), sólo como respaldo |
| Zona horaria objetivo | `America/Bogota` |
| API cruda | `http://localhost:8080` · Swagger en `/docs` |
| UI publicada | `http://localhost:3000` (nginx, proxy `/api/` → `backend:8080`) |

`15765d9` es la base de evaluación y el ancla de todas las citas `archivo:línea` de causas raíz.
Los commits de entrega se ubican sobre `22b4c85`, que sólo agrega documentación: `backend/` y
`frontend/` son idénticos entre ambos SHA. Eso se verificó con el comando siguiente, cuya salida
está vacía porque no hay diferencias.

```bash
git diff 15765d9..22b4c85 --stat -- backend frontend
```

```text

```

## 2. Servicios en ejecución

```bash
docker compose ps
```

```text
NAME                   IMAGE                COMMAND                  SERVICE    CREATED        STATUS        PORTS
energy-ai-backend-1    energy-ai-backend    "/app/api"               backend    45 hours ago   Up 45 hours   0.0.0.0:8080->8080/tcp, [::]:8080->8080/tcp
energy-ai-frontend-1   energy-ai-frontend   "/docker-entrypoint.…"   frontend   45 hours ago   Up 45 hours   0.0.0.0:3000->80/tcp, [::]:3000->80/tcp
```

Digests de imagen efectivamente en ejecución (evitan que una reconstrucción silenciosa invalide
las evidencias):

```bash
docker inspect --format '{{.Name}} {{.Config.Image}} {{.Image}}' energy-ai-backend-1 energy-ai-frontend-1
```

```text
/energy-ai-backend-1 energy-ai-backend sha256:b00084f7215d60ddfbc58565e2f51a05ed6b116884a8f89d792c7f2d41c60cc7
/energy-ai-frontend-1 energy-ai-frontend sha256:6612b3778cf87407960b2d1a88f1c0f31b0c097643178d905106851a61de467b
```

No se reconstruyó ni reinició ningún contenedor durante la ejecución: el dataset CSV y la salida
del motor quedan fijos desde el arranque.

## 3. Alcanzabilidad de las tres superficies

```bash
for u in http://localhost:3000 http://localhost:8080/docs http://localhost:8080/health; do
  printf "%s -> " "$u"; curl -sS -o /dev/null -w "%{http_code}\n" "$u"
done
```

```text
http://localhost:3000 -> 200
http://localhost:8080/docs -> 200
http://localhost:8080/health -> 200
```

## 4. Disponibilidad del navegador (sonda previa, no instalación definitiva)

Caché local de Playwright antes de la sonda:

```bash
ls -1 ~/Library/Caches/ms-playwright
```

```text
b
chromium-1208
chromium-1234
chromium_headless_shell-1208
chromium_headless_shell-1234
ffmpeg-1011
mcp-chrome-6c26f6b
mcp-chrome-84cd27b
```

Sonda de conectividad y de descarga:

```bash
pnpm dlx playwright install chromium
echo "EXIT=$?"
```

```text
EXIT=0
```

La sonda descargó Chrome for Testing 156.0.8078.4 (build `chromium-1248`) y su headless shell,
porque la caché previa (`1208`, `1234`) pertenece a otras versiones de Playwright. Después de la
sonda la caché contiene `chromium-1248`, `chromium_headless_shell-1248` y `ffmpeg-1013`.

**Alcance de esta sonda.** Demuestra que el CDN de navegadores es alcanzable y que la descarga
funciona con la versión actual de Playwright. **No reemplaza** la instalación fijada dentro de
`e2e/` (`pnpm install` + `pnpm exec playwright install chromium`) que exige el requisito E2E-7:
el `@playwright/test` que se fije en `e2e/package.json` puede requerir otra build de Chromium.

## 5. Convenciones de evidencia

### Nombres de archivo

| Tipo | Patrón | Ejemplo |
|---|---|---|
| Captura de UI | `qa/evidencias/BUG-0X_<slug>.png` | `BUG-01_status-counts-dashboard.png` |
| Evidencia de API | `qa/evidencias/api/BUG-0X_<slug>.md` o `CN-0X_<slug>.md` | `BUG-04_page-negativo-500.md` |

Reglas:

- **Un archivo = un hallazgo.** No se mezclan casos ni defectos en el mismo `.md`, porque el
  informe debe poder citar una ruta que resuelva a una sola afirmación.
- El `slug` describe el síntoma, no el módulo: `page-negativo-500` dice qué se observó.
- Las capturas se producen con una ejecución real de navegador (script de Playwright o
  equivalente). No se declara una captura que no exista en disco.
- Fecha en las evidencias de API: formato `YYYY-MM-DD HH:MM (America/Bogota)`.

### Enmascaramiento y datos

- Toda cabecera de autenticación se escribe `Authorization: Bearer <token>`. Nunca se copia el JWT
  completo ni un fragmento que permita reconstruirlo.
- Sólo se usa la cuenta demo `admin@energia.local`. No se copian correos reales ni direcciones IP
  internas; las URLs son siempre `localhost`.
- No se lee, copia ni comita el contenido de `.env`. El único archivo de entorno versionado es
  `.env.example`.
- Los tokens se obtienen en tiempo de ejecución dentro de una variable (`TOKEN=$(...)`); ningún
  script contiene un token literal.
- Antes de cerrar la entrega se ejecuta un escaneo con el patrón de JWT
  (`eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+`) sobre `qa/` y debe devolver cero
  coincidencias.

### Script reproducible

`qa/evidencias/run.sh` regenera todos los `curl` reproducibles de `qa/evidencias/api/`:

```bash
bash qa/evidencias/run.sh          # todos los casos
bash qa/evidencias/run.sh BUG-04   # un solo caso
```

El script pide el token en tiempo de ejecución, usa `curl -sS -i` para conservar la línea de
estado y termina con código distinto de cero cuando el estado HTTP no coincide con el esperado.

**Nota de ubicación.** El ejemplo de `AGENTS.md` muestra `qa/evidencias/api/run.sh`; el requisito
DEF-4 nombra `qa/evidencias/run.sh` como la ruta canónica. Se implementó esta última porque es la
que el requisito exige; el directorio `api/` queda sólo para los archivos por hallazgo.

## 6. Cómo reproducir una evidencia

1. Verificar que el stack esté arriba (`docker compose ps`) y que la línea base coincida.
2. Para API: ejecutar `bash qa/evidencias/run.sh <CASO_ID>` y comparar con el archivo `.md`.
3. Para UI: abrir `http://localhost:3000` con viewport 1440×900 y zona horaria `America/Bogota`, y
   seguir los pasos numerados del defecto en `qa/05-defectos.md`.
4. Contrastar el resultado observado con el `Esperado` y su oráculo citado.

## Índice

Una fila por archivo, con el hallazgo que demuestra y el documento que lo cita. Todo archivo listado
existe en este directorio; ninguno se referencia sin estar en disco.

| Archivo | Hallazgo que demuestra | Citado en |
|---|---|---|
| `BUG-01_status-counts-dashboard.png` | El KPI del despacho muestra `8 normales · 2 alerta · 2 críticas`, no `9/1/2` | `BUG-01`, `SM-04` |
| `api/BUG-01_status-counts.md` | `GET /dashboard/getSummary` → `200` con `status_counts {normal:8, alert:2, critical:2}` | `BUG-01` |
| `BUG-02_paginacion-sin-pagina-2.png` | `1–10 de 12 medidores` con `Siguiente` deshabilitado; M-111 y M-112 inalcanzables | `BUG-02`, `SM-05` |
| `BUG-03_falso-positivo-fuera-de-normales.png` | Pestaña `Normales` activa con `1–8 de 8 medidores` y M-106 ausente | `BUG-03` |
| `api/BUG-03_falso-positivo-fuera-de-normales.md` | `POST /meter/getAll` con `status: NORMAL` → `200`, `count: 8`, filas sin M-106 | `BUG-03` |
| `api/BUG-04_page-negativo-500.md` | `POST /meter/getAll` con `page: -1` → `HTTP/1.1 500` y cuerpo de error interno | `BUG-04`, `CN-05` |
| `BUG-05_ordenes-abiertas-vs-tarjetas.png` | «3 órdenes abiertas» sobre cuatro tarjetas de orden renderizadas | `BUG-05` |
| `BUG-06_hora-de-planta-desfasada.png` | Celda «Detectada» de M-109 con `12/09 09:00` donde el oráculo pide `12/09 14:00` | `BUG-06`, `CN-15` |
| `api/CN-02_sin-token.md` | `POST /meter/getAll` sin `Authorization` → `401` «Falta el token de autenticación» | `CN-02` |
| `api/CN-04_pageSize-101.md` | `POST /meter/getAll` con `size: 101` → `400` con `errors[]` | `CN-04` |
| `api/CN-13_retrigger-200.md` | Reintento mientras el análisis corre → `200` con el mismo `id` | `CN-13` |
| `run.sh` | Regenera los seis curls de `api/`; obtiene el token en tiempo de ejecución y no lo imprime | `DEF-4`, `CN-02`, `CN-04`, `CN-13` |
