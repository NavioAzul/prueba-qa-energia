import { test as setup, expect } from '@playwright/test'
import { LoginPage } from '../pages/login.page'
import { AUTH_FILE, CREDENTIALS } from '../config/env'

/**
 * Inicia sesión una sola vez por corrida y guarda el estado (cookies +
 * localStorage) en `.auth/user.json`. El proyecto `chromium` lo reutiliza, así
 * que ninguna prueba vuelve a iniciar sesión (E2E-2).
 *
 * El token vive en `localStorage['energyai.token']`; `storageState` lo captura
 * junto con el origen, sin imprimirlo ni escribirlo a mano.
 */
setup('iniciar sesión una vez y guardar el estado de sesión', async ({ page }) => {
  const login = new LoginPage(page)

  await login.goto()
  await login.login(CREDENTIALS.email, CREDENTIALS.password)

  // El acceso lleva al despacho: es la señal de que la sesión quedó activa.
  await expect(page.getByRole('heading', { name: 'Despacho', level: 1 })).toBeVisible()

  await page.context().storageState({ path: AUTH_FILE })
})
