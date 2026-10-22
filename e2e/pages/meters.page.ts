import type { Locator, Page } from '@playwright/test'
import { paths } from '../config/env'

/**
 * Libro de medidores: filtros de estado, búsqueda por identificador, orden y
 * paginación.
 *
 * Nota sobre las filas: el encabezado también es un `role="row"`, así que las
 * filas de datos se distinguen por contener un `rowheader` (la celda
 * `<th scope="row">` del medidor). Es una distinción semántica, no posicional:
 * no hay `nth()` ni `nth-child` en ningún lado.
 */
export class MetersPage {
  readonly table
  readonly statusGroup
  readonly searchInput
  readonly searchSubmit
  readonly sortSelect
  readonly pagination
  readonly nextButton

  constructor(private readonly page: Page) {
    this.table = page.getByRole('table')
    this.statusGroup = page.getByRole('group', { name: 'Estado' })
    // `exact` evita que el botón con aria-label "Buscar medidor" también coincida.
    this.searchInput = page.getByLabel('Medidor', { exact: true })
    this.searchSubmit = page.getByRole('button', { name: 'Buscar medidor' })
    this.sortSelect = page.getByLabel('Ordenar por', { exact: true })
    this.pagination = page.getByRole('navigation', { name: 'Paginación' })
    this.nextButton = this.pagination.getByRole('button', { name: 'Siguiente' })
  }

  async goto() {
    await this.page.goto(paths.meters)
  }

  /** Filas de datos (excluye la fila de encabezado). */
  rows(): Locator {
    return this.table.getByRole('row').filter({ has: this.page.getByRole('rowheader') })
  }

  /** Fila del medidor indicado. */
  rowFor(meterId: string): Locator {
    return this.rows().filter({ has: this.meterLink(meterId) })
  }

  /** Enlace del identificador dentro de la tabla. */
  meterLink(meterId: string): Locator {
    return this.table.getByRole('link', { name: meterId, exact: true })
  }

  /** Pestaña de estado dentro del grupo "Estado". */
  statusTab(label: string): Locator {
    return this.statusGroup.getByText(label, { exact: true })
  }

  /**
   * Celdas con sufijo `kWh` de la fila: la primera es "Consumo 24 h" y la
   * segunda "Baseline". Se exponen juntas porque ambas terminan en la unidad;
   * se afirman como arreglo ordenado (sin índices) para fijar cada columna.
   */
  consumptionOf(meterId: string): Locator {
    return this.rowFor(meterId).getByRole('cell').filter({ hasText: /kWh/ })
  }

  /** Celda de variación: es la única de la fila que empieza con signo. */
  variationOf(meterId: string): Locator {
    return this.rowFor(meterId).getByRole('cell').filter({ hasText: /^[+−]\d/ })
  }

  /** Rango "a–b de n medidores" de la paginación. */
  range(): Locator {
    return this.pagination.getByText(/\d+–\d+ de \d+ medidores/)
  }

  /** Aplica la búsqueda por identificador (escribe y envía). */
  async search(meterId: string) {
    await this.searchInput.fill(meterId)
    await this.searchSubmit.click()
  }
}
