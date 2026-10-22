/**
 * Entorno y valores de negocio de la suite E2E.
 *
 * Los datos de prueba viven aquí y no dentro de los tests: un valor esperado
 * repetido en dos archivos es un valor que se puede corregir en uno solo.
 */

/** Origen de la aplicación entregada: nginx sirve la SPA y proxya /api/. */
export const BASE_URL = 'http://localhost:3000'

/**
 * Archivo de estado de sesión (cookies + localStorage), en ruta absoluta
 * derivada de este módulo. Se calcula en un solo lugar para que el proyecto
 * `setup` escriba exactamente el archivo que el proyecto `chromium` lee.
 */
export const AUTH_FILE = new URL('../.auth/user.json', import.meta.url).pathname

/** Base del contrato. Se recorre nginx para que la API se llame como la llama el navegador. */
export const API_BASE = `${BASE_URL}/api/v1`

/** Cuenta demo de docker-compose.yml (no es un secreto: es el valor por defecto del repo). */
export const CREDENTIALS = {
  email: 'admin@energia.local',
  password: 'admin123',
} as const

/** Rutas de la aplicación (frontend/src/config/paths.ts). */
export const paths = {
  login: '/login',
  dashboard: '/',
  meters: '/medidores',
  meter: (meterId: string) => `/medidores/${encodeURIComponent(meterId)}`,
  anomalies: '/anomalias',
} as const

/**
 * Valores de negocio esperados. Cada aserción del E2E cita esta tabla; cada
 * valor cita su oráculo.
 */
export const EXPECTED = {
  /** backend/README.md:24 — 12 medidores en el dataset. */
  metersTotal: 12,
  /** useMeterFilters.ts:7 — PAGE_SIZE = 10. */
  pageSize: 10,
  /** backend/README.md:15 — 4 anomalías. */
  anomaliesTotal: 4,
  /** README.md:9-14 — orden de prioridad de las órdenes. */
  priorityOrder: ['M-109', 'M-112', 'M-104', 'M-106'],
  m109: {
    /** backend/README.md:109 — "M-109: 2.207,6 kWh contra 1.052,15 kWh, +109,8 %". */
    consumptionKwh: '2.207,6 kWh',
    /** Mismo oráculo: la línea base del medidor (1.052,15 kWh → 1 decimal). */
    baselineKwh: '1.052,2 kWh',
    /** Mismo oráculo: variación contra la línea base. */
    variationPct: '+109,8 %',
    /** backend/README.md:107 + labels.ts:10 — estado derivado del motor. */
    status: 'Crítica',
    /** backend/README.md:28 — "desde 12/09 14:00" (hora de planta, sin conversión). */
    detectedAt: '12/09 14:00',
  },
} as const
