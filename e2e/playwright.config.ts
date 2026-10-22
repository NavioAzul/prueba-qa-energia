import { defineConfig, devices } from '@playwright/test'
import { AUTH_FILE, BASE_URL } from './config/env'

/**
 * Configuración de la suite E2E de EnergIA.
 *
 * Decisiones que no son cosméticas:
 * - `baseURL: http://localhost:3000` (nginx): es la única topología que se
 *   entrega. Contra :8080 no hay UI y contra :5173 se prueba un proxy de
 *   desarrollo que el producto no publica.
 * - `retries: 0`: un verde comprado con reintentos no es una señal; el rubro
 *   mide exactamente eso.
 * - `workers: 1` + `fullyParallel: false`: la suite comparte un único estado
 *   autenticado, así que se serializa para eliminar fallas por orden.
 * - `timezoneId: 'America/Bogota'`: hora de planta; es la carga útil del
 *   test del defecto de zona horaria (BUG-06).
 * - `viewport: 1440×900`: dos celdas de fecha están condicionadas por
 *   breakpoint (`lg` y `xl`), y el valor por defecto (1280×720) cae justo
 *   sobre el borde.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    baseURL: BASE_URL,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      // Inicia sesión una sola vez por corrida y guarda el estado de sesión.
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: { cookies: [], origins: [] } },
    },
    {
      // Depende de 'setup': el archivo de sesión existe antes de la primera prueba.
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_FILE,
        viewport: { width: 1440, height: 900 },
        timezoneId: 'America/Bogota',
      },
    },
  ],
})
