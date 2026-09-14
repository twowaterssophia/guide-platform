import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { createMapBundle } from './map-bundle'

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2rZkAAAAASUVORK5CYII=', 'base64')
const pcd = Buffer.from('# .PCD v0.7\nVERSION 0.7\nFIELDS x y z\nSIZE 4 4 4\nTYPE F F F\nCOUNT 1 1 1\nWIDTH 1\nHEIGHT 1\nPOINTS 1\nDATA ascii\n0 0 0\n')
const metadata = Buffer.from(JSON.stringify({
  formatVersion: 1,
  resolution: 0.05,
  origin: { x: 0, y: 0, yaw: 0 },
  width: 1,
  height: 1,
  frameId: 'map',
  imageAxes: { x: 'right', y: 'down' },
  occupiedThreshold: 0.65,
  freeThreshold: 0.2,
  pcdTransform: {
    translation: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
  },
}))

async function createTestMap(request: APIRequestContext, name: string) {
  const response = await request.post('/api/v1/maps', {
    multipart: {
      name,
      bundle: {
        name: 'lifecycle.zip',
        mimeType: 'application/zip',
        buffer: createMapBundle([
          { name: 'lifecycle.pcd', value: pcd },
          { name: 'lifecycle.png', value: png },
          { name: 'lifecycle.json', value: metadata },
        ]),
      },
    },
  })
  expect(response.status()).toBe(201)
  return response.json() as Promise<{ id: string }>
}

async function createTask(request: APIRequestContext, mapId: string, name: string) {
  const response = await request.post('/api/v1/tour-tasks', {
    data: {
      name,
      mapId,
      personaId: '__system_default__',
      points: [
        { key: 'one', name: '入口', x: 100, y: 100, angle: 0, actions: [{ type: 'SPEECH', narration: '欢迎。' }] },
        { key: 'two', name: '展项', x: 300, y: 200, angle: 180, actions: [] },
      ],
      paths: [{ fromPointKey: 'one', toPointKey: 'two', actions: [] }],
    },
  })
  expect(response.status()).toBe(201)
  return response.json() as Promise<{ id: string }>
}

async function createSilentDefaultPersonaTask(request: APIRequestContext, mapId: string, name: string) {
  const response = await request.post('/api/v1/tour-tasks', {
    data: {
      name,
      mapId,
      personaId: '__system_default__',
      points: [{ key: 'one', name: '入口', x: 100, y: 100, angle: 0, actions: [] }],
      paths: [],
    },
  })
  expect(response.status()).toBe(201)
  return response.json() as Promise<{ id: string }>
}

test('task detail has no publish/archive lifecycle and remains editable', async ({ page, request }, testInfo) => {
  const suffix = `${testInfo.project.name}-${Date.now()}`
  const map = await createTestMap(request, `TASK-005 lifecycle map ${suffix}`)
  const task = await createTask(request, map.id, `TASK-005 lifecycle task ${suffix}`)
  try {
    await page.goto(`/tour-tasks/${task.id}`)
    await expect(page.getByRole('heading', { name: `TASK-005 lifecycle task ${suffix}` })).toBeVisible()
    await expect(page.getByRole('button', { name: '发布任务' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '归档任务' })).toHaveCount(0)
    await page.getByRole('button', { name: '编辑' }).click()
    await expect(page).toHaveURL(new RegExp(`/tour-tasks/${task.id}/edit$`))
  } finally {
    expect((await request.delete(`/api/v1/tour-tasks/${task.id}`)).status()).toBe(204)
    expect((await request.delete(`/api/v1/maps/${map.id}`)).status()).toBe(204)
  }
})

test('task detail hides the default persona when there are no voice tasks', async ({ page, request }, testInfo) => {
  const suffix = `${testInfo.project.name}-${Date.now()}`
  const map = await createTestMap(request, `TASK-005 silent map ${suffix}`)
  const task = await createSilentDefaultPersonaTask(request, map.id, `TASK-005 silent task ${suffix}`)
  try {
    await page.goto(`/tour-tasks/${task.id}`)
    await expect(page.getByRole('heading', { name: '人设', exact: true })).toHaveCount(0)
  } finally {
    expect((await request.delete(`/api/v1/tour-tasks/${task.id}`)).status()).toBe(204)
    expect((await request.delete(`/api/v1/maps/${map.id}`)).status()).toBe(204)
  }
})
