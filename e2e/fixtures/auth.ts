import { test as base, expect } from '@playwright/test'
import { LoginPage } from '../pages/login.page'
import { MetersPage } from '../pages/meters.page'
import { MeterDetailPage } from '../pages/meter-detail.page'
import { AnomaliesPage } from '../pages/anomalies.page'

/** Page objects que exponen las pantallas bajo prueba. */
export type AppPages = {
  login: LoginPage
  meters: MetersPage
  meterDetail: MeterDetailPage
  anomalies: AnomaliesPage
}

/**
 * Prueba base de la suite **con sesión**.
 *
 * La sesión no se arma aquí: el proyecto `setup` inicia sesión una sola vez y
 * el proyecto `chromium` reutiliza `.auth/user.json` vía `storageState`, así
 * que ninguna prueba inicia sesión por su cuenta.
 *
 * Además entrega los page objects ya construidos, para que ningún test repita
 * navegación ni localizadores (los compartidos viven en `pages/`).
 */
export const test = base.extend<AppPages>({
  login: async ({ page }, use) => {
    await use(new LoginPage(page))
  },
  meters: async ({ page }, use) => {
    await use(new MetersPage(page))
  },
  meterDetail: async ({ page }, use) => {
    await use(new MeterDetailPage(page))
  },
  anomalies: async ({ page }, use) => {
    await use(new AnomaliesPage(page))
  },
})

export { expect }
