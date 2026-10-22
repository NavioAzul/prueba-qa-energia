import type { Locator, Page } from '@playwright/test'
import { paths } from '../config/env'

/**
 * Anomalías IA: la lista de órdenes en orden de prioridad.
 *
 * Los localizadores de celda se acotan a la tabla y se distinguen por el
 * vocabulario de cada columna (tipo, acción, fecha). Esa es la razón por la
 * que no hace falta ningún índice: dentro de una fila, la única celda con
 * `dd/mm hh:mm` es "Detectada".
 */
export class AnomaliesPage {
  readonly table

  constructor(private readonly page: Page) {
    this.table = page.getByRole('table')
  }

  async goto() {
    await this.page.goto(paths.anomalies)
  }

  /** Enlaces de medidor en el orden en que la tabla los pinta (prioridad). */
  meterIds(): Locator {
    return this.table.getByRole('link', { name: /^M-\d{3}$/ })
  }

  meterLink(meterId: string): Locator {
    return this.table.getByRole('link', { name: meterId, exact: true })
  }

  rowFor(meterId: string): Locator {
    return this.table.getByRole('row').filter({ has: this.meterLink(meterId) })
  }

  /** Celda "Tipo". */
  typeOf(meterId: string): Locator {
    return this.cellOf(meterId, /(Anomalía real|Anomalía explicable|Falso positivo|Calidad de datos)/)
  }

  /** Celda "Acción". */
  actionOf(meterId: string): Locator {
    return this.cellOf(meterId, /(Investigar|Validar operación|No escalar|Validar medidor)/)
  }

  /** Celda "Detectada" (hora de planta, sin conversión de zona). */
  detectedAtOf(meterId: string): Locator {
    return this.cellOf(meterId, /\d{2}\/\d{2} \d{2}:\d{2}/)
  }

  private cellOf(meterId: string, pattern: RegExp): Locator {
    return this.rowFor(meterId).getByRole('cell').filter({ hasText: pattern })
  }
}
