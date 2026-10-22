import { test, expect } from '../fixtures/auth'
import { EXPECTED } from '../config/env'

/**
 * E2E-01 · Flujo de negocio del operador.
 *
 * Afirma valores de negocio reales —filas, consumo, variación, estado derivado
 * y orden de prioridad—, no "la página cargó". Todos los valores salen de
 * `config/env.ts`, cada uno con su oráculo citado.
 *
 * No inicia sesión: el estado llega por `storageState` del proyecto `setup`
 * (E2E-2). Todas las aserciones son web-first y reintentan solas.
 */
test('E2E-01 · el flujo de negocio muestra los valores de planta del medidor y el orden de las órdenes', async ({
  meters,
  meterDetail,
  anomalies,
}) => {
  // 1 · El libro de medidores pagina de a 10 sobre los 12 del dataset.
  await meters.goto()
  await expect(meters.rows()).toHaveCount(EXPECTED.pageSize)

  // 2 · La búsqueda por identificador deja una sola fila.
  await meters.search('M-109')
  await expect(meters.rows()).toHaveCount(1)

  // 3 · Consumo 24 h y baseline del medidor, con el formato es-CO del producto.
  //     La columna Baseline también termina en "kWh", así que se afirma el
  //     arreglo ordenado de las celdas de consumo (sin índices).
  await expect(meters.consumptionOf('M-109')).toHaveText([
    EXPECTED.m109.consumptionKwh,
    EXPECTED.m109.baselineKwh,
  ])

  // 4 · Variación contra la línea base, con su signo.
  await expect(meters.variationOf('M-109')).toHaveText(EXPECTED.m109.variationPct)

  // 5 · El detalle del medidor confirma el estado derivado por el motor.
  await meters.meterLink('M-109').click()
  await expect(meterDetail.statusStamp).toHaveText(EXPECTED.m109.status)

  // 6 · Las órdenes de anomalía llegan en orden de prioridad.
  await anomalies.goto()
  await expect(anomalies.meterIds()).toHaveText(EXPECTED.priorityOrder)
})
