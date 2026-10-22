import type { Page } from '@playwright/test'
import { paths } from '../config/env'

/**
 * Pantalla de acceso. La usa **solo** el proyecto `setup`: ninguna prueba
 * inicia sesión por su cuenta (el estado llega por `storageState`).
 *
 * Localizadores por etiqueta y rol, nunca por posición ni por ruta CSS.
 */
export class LoginPage {
  readonly email
  readonly password
  readonly submit
  readonly error

  constructor(private readonly page: Page) {
    this.email = page.getByLabel('Email', { exact: true })
    this.password = page.getByLabel('Contraseña', { exact: true })
    this.submit = page.getByRole('button', { name: 'Entrar' })
    this.error = page.getByRole('alert')
  }

  async goto() {
    await this.page.goto(paths.login)
  }

  /** Completa el formulario real y entra. No espera por tiempo: la prueba que
   *  la invoca afirma el resultado con una aserción web-first. */
  async login(email: string, password: string) {
    await this.email.fill(email)
    await this.password.fill(password)
    await this.submit.click()
  }
}
