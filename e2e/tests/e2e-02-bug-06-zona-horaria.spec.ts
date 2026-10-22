import { test, expect } from '../fixtures/auth'
import { EXPECTED } from '../config/env'

/**
 * Este archivo graba siempre (traza, video y captura) aunque la configuración
 * general retenga solo ante fallo: como el test está en `test.fail()`, la
 * falla es *esperada* y Playwright no conserva los artefactos
 * (`retain-on-failure` conserva solo cuando `status !== expectedStatus`). Los
 * artefactos de este test son la evidencia de que el defecto está vivo, así
 * que se piden explícitamente (E2E-1).
 */
test.use({ trace: 'on', video: 'on', screenshot: 'on' })

/**
 * E2E-02 · BUG-06 · La hora de planta se lee en la zona del navegador.
 *
 * `formatPlantTime` (frontend/src/lib/format.ts:55-58) documenta en su propio
 * comentario "se leen las partes UTC para NO convertirla a la zona del
 * navegador", pero usa `getDate()/getHours()/getMinutes()` —partes locales—.
 * Con `timezoneId: 'America/Bogota'` (UTC−5) la lectura de M-109
 * (`2026-09-12T14:00:00Z`) se muestra 5 h antes: `12/09 09:00` en vez de
 * `12/09 14:00` que exige `backend/README.md:28`.
 *
 * Por qué es un defecto y no una decisión de diseño: `formatPlantDate`, en el
 * mismo archivo (`format.ts:63`), sí usa las partes UTC (`getUTCDate`,
 * `getUTCMonth`), y el comentario de `format.ts:51-52` declara la intención
 * contraria.
 *
 * Falla hoy por esta razón exacta. Cuando `format.ts:57` pase a usar
 * `getUTCHours()`, la aserción pasa, `test.fail()` la reporta como
 * "unexpectedly passed" y la corrida queda en rojo: eso es el detector. No hay
 * `try/catch` ni guarda condicional que lo desactive en tiempo de ejecución.
 */
test('E2E-02 · la hora de planta de M-109 no se desplaza 5 h', async ({ anomalies }) => {
  test.fail(true, 'BUG-06 · formatPlantTime usa partes locales en vez de partes UTC')

  await anomalies.goto()

  await expect(anomalies.detectedAtOf('M-109')).toHaveText(EXPECTED.m109.detectedAt)
})
