import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

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
      pcd: { name: 'lifecycle.pcd', mimeType: 'application/vnd.pointclouds', buffer: pcd },
      preview: { name: 'lifecycle.png', mimeType: 'image/png', buffer: png },
      metadata: { name: 'lifecycle.json', mimeType: 'application/json', buffer: metadata },
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

test('publishes, archives, and republishes a task with explicit confirmations', async ({ page, request }, testInfo) => {
  const suffix = `${testInfo.project.name}-${Date.now()}`
  const map = await createTestMap(request, `TASK-005 lifecycle map ${suffix}`)
  const task = await createTask(request, map.id, `TASK-005 lifecycle task ${suffix}`)
  try {
    await page.goto(`/tour-tasks/${task.id}`)
    await expect(page.locator('.task-detail-meta').getByText('草稿', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '发布任务' }).click()
    const publishDialog = page.getByRole('dialog', { name: `确认发布“TASK-005 lifecycle task ${suffix}”？` })
    await expect(publishDialog).toBeVisible()
    const publishResponse = page.waitForResponse((response) => response.url().endsWith(`/api/v1/tour-tasks/${task.id}/publish`) && response.request().method() === 'POST')
    await publishDialog.getByRole('button', { name: '发布任务' }).click()
    expect((await publishResponse).status()).toBe(200)
    await expect(page.locator('.task-detail-meta').getByText('已发布', { exact: true })).toBeVisible()
    await expect(page.getByText('v2', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: '归档任务' }).click()
    const archiveDialog = page.getByRole('dialog', { name: `确认归档“TASK-005 lifecycle task ${suffix}”？` })
    await expect(archiveDialog).toBeVisible()
    const archiveResponse = page.waitForResponse((response) => response.url().endsWith(`/api/v1/tour-tasks/${task.id}/archive`) && response.request().method() === 'POST')
    await archiveDialog.getByRole('button', { name: '归档任务' }).click()
    expect((await archiveResponse).status()).toBe(200)
    await expect(page.locator('.task-detail-meta').getByText('已归档', { exact: true })).toBeVisible()
    await expect(page.getByText('v2', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: '再次发布' }).click()
    const republishDialog = page.getByRole('dialog', { name: `确认发布“TASK-005 lifecycle task ${suffix}”？` })
    await expect(republishDialog).toBeVisible()
    const republishResponse = page.waitForResponse((response) => response.url().endsWith(`/api/v1/tour-tasks/${task.id}/publish`) && response.request().method() === 'POST')
    await republishDialog.getByRole('button', { name: '发布任务' }).click()
    expect((await republishResponse).status()).toBe(200)
    await expect(page.locator('.task-detail-meta').getByText('已发布', { exact: true })).toBeVisible()
    await expect(page.getByText('v3', { exact: true })).toBeVisible()
    await expect(page.getByText('已发布任务需先归档后编辑')).toBeVisible()
  } finally {
    expect((await request.delete(`/api/v1/tour-tasks/${task.id}`)).status()).toBe(204)
    expect((await request.delete(`/api/v1/maps/${map.id}`)).status()).toBe(204)
  }
})
