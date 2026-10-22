import { test as base, expect, type APIRequestContext, type APIResponse } from '@playwright/test'
import { API_BASE, CREDENTIALS } from '../config/env'

/**
 * Cliente HTTP autenticado para los casos de contrato de API.
 *
 * Trampa documentada: la respuesta de login es **plana** — trae `access_token`
 * en la raíz, sin envoltorio `data`. Leer `json().data.access_token` devuelve
 * `undefined` y cada llamada saldría con `Bearer undefined`.
 *
 * Las rutas se construyen sobre `${BASE_URL}/api/v1` para que las llamadas
 * recorran nginx igual que el navegador.
 */
export class ApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly token: string,
  ) {}

  private options() {
    return { headers: { Authorization: `Bearer ${this.token}` } }
  }

  get(path: string): Promise<APIResponse> {
    return this.request.get(`${API_BASE}${path}`, this.options())
  }

  post(path: string, data?: unknown): Promise<APIResponse> {
    return this.request.post(`${API_BASE}${path}`, { ...this.options(), data })
  }
}

/**
 * Prueba base para casos de API. Extiende la prueba **base** (no la de sesión):
 * un `APIRequestContext` no comparte `storageState` con el navegador, así que
 * el token se obtiene por la API y se expone como fixture.
 */
export const apiTest = base.extend<{ api: ApiClient }>({
  api: async ({ request, baseURL }, use) => {
    const login = await request.post(`${baseURL}/api/v1/auth/login`, { data: CREDENTIALS })
    expect(login.status()).toBe(200)

    const { access_token: accessToken } = (await login.json()) as { access_token: string }
    await use(new ApiClient(request, accessToken))
  },
})

export { expect }
