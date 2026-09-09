import assert from 'node:assert/strict'
import test from 'node:test'
import { BadRequestException } from '@nestjs/common'
import { normalizeApiError } from '../src/errors/api-exception.filter'

test('normalizes validation errors to the shared response shape', () => {
  const result = normalizeApiError(new BadRequestException(['name must not be empty']), 'request-123')

  assert.deepEqual(result, {
    status: 400,
    body: {
      code: 'VALIDATION_ERROR',
      message: 'name must not be empty',
      requestId: 'request-123',
    },
  })
})

test('does not expose unexpected internal errors', () => {
  const result = normalizeApiError(new Error('database password'), 'request-456')

  assert.deepEqual(result, {
    status: 500,
    body: {
      code: 'INTERNAL_ERROR',
      message: '服务内部错误',
      requestId: 'request-456',
    },
  })
})
