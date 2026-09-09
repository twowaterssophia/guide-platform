import assert from 'node:assert/strict'
import test from 'node:test'
import {
  apiErrorSchema,
  skillListSchema,
  tourTaskListSchema,
  tourTaskUpdateInputSchema,
  tourTaskWriteInputSchema,
} from '../dist/index.js'

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

test('accepts official and cloud skills', () => {
  const result = skillListSchema.safeParse([
    { id: 'official-greeting', name: '打招呼', source: 'official', version: '1.0.0', compatible: true },
    { id: 'cloud-turn-head', name: '转动头部', source: 'cloud', version: '2.1.0', compatible: false },
  ])

  assert.equal(result.success, true)
})

test('accepts a map-bound task with continuous paths and typed actions', () => {
  const result = tourTaskWriteInputSchema.safeParse({
    name: '大厅导览',
    mapId: 'map-1',
    personaId: null,
    points: [
      { key: 'entrance', name: '入口', x: 100, y: 240, angle: 90, actions: [{ type: 'SPEECH', narration: '欢迎来到大厅。' }] },
      { key: 'service-desk', name: '服务台', x: 420, y: 240, angle: 0, actions: [{ type: 'SKILL', skillId: 'official-greeting' }] },
    ],
    paths: [{ fromPointKey: 'entrance', toPointKey: 'service-desk', actions: [{ type: 'SPEECH', narration: '前方是服务台。' }] }],
  })

  assert.equal(result.success, true)
})

test('rejects non-continuous paths and skills on a path', () => {
  const result = tourTaskWriteInputSchema.safeParse({
    name: '大厅导览',
    mapId: 'map-1',
    personaId: null,
    points: [
      { key: 'entrance', name: '入口', x: 100, y: 240, angle: 90, actions: [] },
      { key: 'service-desk', name: '服务台', x: 420, y: 240, angle: 0, actions: [] },
    ],
    paths: [{ fromPointKey: 'service-desk', toPointKey: 'entrance', actions: [{ type: 'SKILL', skillId: 'official-greeting' }] }],
  })

  assert.equal(result.success, false)
})

test('applies continuous path validation to task updates', () => {
  const result = tourTaskUpdateInputSchema.safeParse({
    name: '大厅导览',
    mapId: 'map-1',
    personaId: null,
    expectedVersion: 2,
    points: [{ key: 'entrance', name: '入口', x: 100, y: 240, angle: 90, actions: [] }],
    paths: [{ fromPointKey: 'entrance', toPointKey: 'entrance', actions: [] }],
  })

  assert.equal(result.success, false)
})
