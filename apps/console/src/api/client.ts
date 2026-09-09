const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000/api/v1'

export class ApiClientError extends Error {
  constructor(public readonly status: number) {
    super(`请求失败（${status}）`)
    this.name = 'ApiClientError'
  }
}

async function requestJson(path: string, init?: RequestInit) {
  const url = `${apiBaseUrl}${path}`
  const response = init ? await fetch(url, init) : await fetch(url)
  if (!response.ok) throw new ApiClientError(response.status)
  if (response.status === 204) return undefined
  return response.json() as Promise<unknown>
}

export function getJson(path: string) {
  return requestJson(path)
}

export function postJson(path: string, body: unknown) {
  return requestJson(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function patchJson(path: string, body: unknown) {
  return requestJson(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function deleteResource(path: string) {
  return requestJson(path, { method: 'DELETE' })
}
