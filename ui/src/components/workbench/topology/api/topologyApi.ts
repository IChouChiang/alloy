import type { TopologyGraphPayload, TopologySpec } from '../../types'

export const TOPOLOGY_API_BASE_CANDIDATES = [
  '',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
] as const

type FetchJsonResult<T> = {
  data: T
  baseUrl: string
}

/**
 * Fetches JSON from topology API with base-url fallback.
 *
 * @param path API path starting with `/`.
 * @param init Optional fetch init options.
 * @param candidates Ordered API base-url candidates.
 * @returns Resolved JSON payload and base URL used for the successful request.
 * @throws {Error} If all candidate requests fail.
 */
async function fetchJsonWithFallback<T>(
  path: string,
  init?: RequestInit,
  candidates: readonly string[] = TOPOLOGY_API_BASE_CANDIDATES,
): Promise<FetchJsonResult<T>> {
  let lastError = 'unknown error'
  for (const baseUrl of candidates) {
    const requestUrl = `${baseUrl}${path}`
    try {
      const response = await fetch(requestUrl, init)
      if (!response.ok) {
        lastError = `${requestUrl} -> HTTP ${response.status}`
        continue
      }
      const data = (await response.json()) as T
      return { data, baseUrl }
    } catch (error) {
      lastError = `${requestUrl} -> ${String(error)}`
    }
  }
  throw new Error(lastError)
}

/**
 * Loads case39 topology graph payload from backend.
 *
 * @returns Graph payload and resolved backend base URL.
 */
export async function loadCase39TopologyGraph(): Promise<{
  payload: TopologyGraphPayload
  baseUrl: string
}> {
  const result = await fetchJsonWithFallback<TopologyGraphPayload>(
    '/api/topology/case39/graph',
  )
  return {
    payload: result.data,
    baseUrl: result.baseUrl,
  }
}

/**
 * Validates topology specs against backend no-islanding constraints.
 *
 * @param specs Topology specs to validate.
 * @param apiBaseUrl Preferred backend base URL discovered from graph loading.
 * @returns Backend validation payload.
 * @throws {Error} If all validation attempts fail.
 */
export async function validateTopologySpecs(
  specs: TopologySpec[],
  apiBaseUrl: string,
): Promise<unknown> {
  const candidates =
    apiBaseUrl !== '' ? [apiBaseUrl] : [...TOPOLOGY_API_BASE_CANDIDATES]
  let lastError = 'unknown error'
  for (const baseUrl of candidates) {
    const requestUrl = `${baseUrl}/api/topology/specs/validate`
    try {
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topology_specs: specs }),
      })
      if (!response.ok) {
        const payload = await response
          .json()
          .catch(() => ({ detail: response.statusText }))
        lastError = `${requestUrl} -> ${String(
          payload.detail ?? response.statusText,
        )}`
        continue
      }
      return response.json()
    } catch (error) {
      lastError = `${requestUrl} -> ${String(error)}`
    }
  }
  throw new Error(lastError)
}
