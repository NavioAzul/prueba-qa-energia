import type { Locator, Page } from '@playwright/test'
import { paths } from '../config/env'

/**
 * Detalle de un medidor.
 *
 * El encabezado es un `<section aria-labelledby>` que expone rol `region` con
 * el identificador del medidor como nombre accesible: eso permite acotar el
 * estado y la variación al medidor de esta pantalla sin usar posiciones.
 * El sello de estado se busca por su vocabulario (Normal/Alerta/Crítica) y no
 * por el valor esperado: así una aserción fallida muestra el valor obtenido en
 * lugar de "elemento no encontrado".
 */
export class MeterDetailPage {
  readonly header
  readonly statusStamp
  readonly variation

  constructor(private readonly page: Page) {
    this.header = page.getByRole('region', { name: /^M-\d{3}$/ })
    this.statusStamp = this.header.getByText(/^(Normal|Alerta|Crítica)$/)
    this.variation = this.header.getByText(/^[+−]\d+,\d %$/)
  }

  async goto(meterId: string) {
    await this.page.goto(paths.meter(meterId))
  }

  /** Enlace "Abrir investigación" cuando el medidor tiene una orden. */
  openInvestigation(): Locator {
    return this.page.getByRole('link', { name: 'Abrir investigación' })
  }
}
