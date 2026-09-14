const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code?: string,
    message = `请求失败（${status}）`,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

async function requestJson(path: string, init?: RequestInit) {
  const url = `${apiBaseUrl}${path}`
  const response = init ? await fetch(url, init) : await fetch(url)
  if (!response.ok) {
    const body = typeof response.json === 'function'
      ? await response.json().catch(() => undefined) as { code?: unknown; message?: unknown } | undefined
      : undefined
    throw new ApiClientError(
      response.status,
      typeof body?.code === 'string' ? body.code : undefined,
      typeof body?.message === 'string' ? body.message : undefined,
    )
  }
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

export function postForm(path: string, body: FormData) {
  return requestJson(path, { method: 'POST', body })
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

export function getApiAssetUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path
  if (/^https?:\/\//i.test(apiBaseUrl)) return new URL(path, apiBaseUrl).toString()
  return path
}
