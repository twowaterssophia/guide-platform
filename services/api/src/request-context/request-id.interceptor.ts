const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/

export interface RequestWithContext {
  method?: string
  url?: string
  headers?: Record<string, string | string[] | undefined>
  requestId?: string
}

export interface ResponseWithHeaders {
  header: (name: string, value: string) => void
  statusCode?: number
}

export function resolveRequestId(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value
  return candidate && requestIdPattern.test(candidate) ? candidate : crypto.randomUUID()
}

export function attachRequestId(request: RequestWithContext, response: ResponseWithHeaders) {
  const requestId = request.requestId ?? resolveRequestId(request.headers?.['x-request-id'])
  request.requestId = requestId
  response.header('X-Request-Id', requestId)
  return requestId
}
