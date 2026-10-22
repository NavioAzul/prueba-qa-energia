import { apiTest as test, expect } from '../fixtures/api'
import { API_BASE, EXPECTED } from '../config/env'

/**
 * E2E-03 · Contrato de la API a través de nginx.
 *
 * Tres piernas que el reporte de defectos ya reproduce con `curl`, ahora como
 * regresión automatizada: la autenticación obligatoria, la validación de
 * entrada negativa y la paginación del contrato.
 *
 * La tercera pierna es también una consistencia entre capas: la API pagina
 * correctamente las 12 filas (2 en la página 2) mientras la UI no ofrece la
 * página 2 —eso es BUG-02, y el test lo deja fijado desde el lado de la API.
 */
test('E2E-03 · el contrato de la API responde como está documentado', async ({ api, request }) => {
  // 1 · Sin `Authorization`, la ruta protegida responde 401 (ni 200 ni 500).
  const sinToken = await request.post(`${API_BASE}/meter/getAll`, {
    data: { pagination: { page: 1, size: EXPECTED.pageSize } },
  })
  expect(sinToken.status()).toBe(401)

  // 2 · `size: 101` excede el máximo declarado: 400 con detalle de validación,
  //     nunca un 500. (CN-04)
  const tamanoInvalido = await api.post('/meter/getAll', {
    pagination: { page: 1, size: 101 },
  })
  expect(tamanoInvalido.status()).toBe(400)

  const invalido = (await tamanoInvalido.json()) as { errors?: unknown[] }
  expect(invalido.errors?.length ?? 0).toBeGreaterThan(0)

  // 3 · La página 2 del contrato trae las 2 filas restantes sobre 12 medidores.
  const pagina2 = await api.post('/meter/getAll', {
    pagination: { page: 2, size: EXPECTED.pageSize },
  })
  expect(pagina2.status()).toBe(200)

  const paginado = (await pagina2.json()) as { count: number; rows: unknown[] }
  expect(paginado.count).toBe(EXPECTED.metersTotal)
  expect(paginado.rows).toHaveLength(EXPECTED.metersTotal - EXPECTED.pageSize)
})
