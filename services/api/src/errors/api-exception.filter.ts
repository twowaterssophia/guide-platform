import { Catch, HttpException, Logger } from '@nestjs/common'
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { ApiError } from '@guide/contracts'

export interface ApiErrorResponse {
  status: number
  body: ApiError
}

const statusCodes: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
}

function stringifyMessage(message: unknown): string {
  if (Array.isArray(message)) return message.map((item) => stringifyMessage(item)).join('；')
  if (typeof message === 'string' && message.trim()) return message
  return '请求失败'
}

export function normalizeApiError(exception: unknown, requestId: string): ApiErrorResponse {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    if (exception.code === 'P2025') {
      return { status: 404, body: { code: 'NOT_FOUND', message: '资源不存在', requestId } }
    }
    if (exception.code === 'P2002') {
      return { status: 409, body: { code: 'CONFLICT', message: '资源已存在', requestId } }
    }
    if (exception.code === 'P2003') {
      return { status: 409, body: { code: 'RESOURCE_CONFLICT', message: '资源引用冲突', requestId } }
    }
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus()
    const response = exception.getResponse()
    const details = typeof response === 'object' && response !== null ? response as { code?: unknown; message?: unknown } : undefined
    return {
      status,
      body: {
        code: typeof details?.code === 'string' ? details.code : statusCodes[status] ?? 'REQUEST_ERROR',
        message: stringifyMessage(details?.message ?? response),
        requestId,
      },
    }
  }

  return {
    status: 500,
    body: { code: 'INTERNAL_ERROR', message: '服务内部错误', requestId },
  }
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiException')

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp()
    const request = http.getRequest<{ requestId?: string }>()
    const response = http.getResponse<{
      header: (name: string, value: string) => void
      status: (code: number) => { send: (body: ApiError) => void }
    }>()
    const requestId = request.requestId ?? crypto.randomUUID()
    const normalized = normalizeApiError(exception, requestId)

    if (normalized.status >= 500) this.logger.error(JSON.stringify(normalized.body))

    response.header('X-Request-Id', requestId)
    response.status(normalized.status).send(normalized.body)
  }
}
