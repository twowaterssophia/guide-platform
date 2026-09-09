import assert from 'node:assert/strict'
import test from 'node:test'
import { apiErrorSchema, tourTaskListSchema } from '../dist/index.js'

test('accepts a valid tour task list', () => {
  const result = tourTaskListSchema.safeParse([{
    id: 'task-1',
    name: 'Lobby tour',
    mapName: 'Main floor',
    pointCount: 3,
    status: 'DRAFT',
    version: 1,
    createdAt: '2026-09-09T00:00:00.000Z',
    updatedAt: '2026-09-09T00:00:00.000Z',
  }])

  assert.equal(result.success, true)
})

test('requires a request ID in API errors', () => {
  const result = apiErrorSchema.safeParse({
    code: 'NOT_FOUND',
    message: 'Resource not found',
  })

  assert.equal(result.success, false)
})
