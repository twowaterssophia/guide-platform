import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2rZkAAAAASUVORK5CYII=', 'base64')
const pcd = Buffer.from('# .PCD v0.7\nVERSION 0.7\nFIELDS x y z\nSIZE 4 4 4\nTYPE F F F\nCOUNT 1 1 1\nWIDTH 1\nHEIGHT 1\nPOINTS 1\nDATA ascii\n0 0 0\n')
const metadata = Buffer.from(JSON.stringify({
  formatVersion: 1,
  resolution: 0.05,
  origin: { x: -2, y: -3, yaw: 0 },
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
  return request.post('/api/v1/maps', {
    multipart: {
      name,
      pcd: { name: 'map.pcd', mimeType: 'application/vnd.pointclouds', buffer: pcd },
      preview: { name: 'map.png', mimeType: 'image/png', buffer: png },
      metadata: { name: 'map.json', mimeType: 'application/json', buffer: metadata },
    },
  })
}

test('map upload modal protects selected files from accidental dismissal', async ({ page }) => {
  await page.goto('/maps')
  await page.getByRole('button', { name: '添加地图' }).first().click()
  const uploadDialog = page.getByRole('dialog', { name: '添加地图' })
  await expect(uploadDialog).toBeVisible()
  await uploadDialog.getByLabel('地图名称').fill('未上传地图')
  await page.keyboard.press('Escape')

  const discardDialog = page.getByRole('dialog', { name: '放弃未上传的地图？' })
  await expect(discardDialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(discardDialog).toBeVisible()
  await discardDialog.getByRole('button', { name: '继续编辑' }).click()
  await expect(uploadDialog).toBeVisible()
  await uploadDialog.getByRole('button', { name: '取消' }).click()
  await page.getByRole('dialog', { name: '放弃未上传的地图？' }).getByRole('button', { name: '放弃上传' }).click()
  await expect(uploadDialog).toBeHidden()
})

test('uploads a registered map bundle and completes detail management', async ({ page, request }, testInfo) => {
  const name = `D3-03 map ${testInfo.project.name} ${Date.now()}`
  let mapId = ''
  await page.goto('/maps')
  await page.getByRole('button', { name: '添加地图' }).first().click()
  const dialog = page.getByRole('dialog', { name: '添加地图' })
  await dialog.getByLabel('地图名称').fill(name)
  await dialog.getByLabel('三维地图（PCD）').setInputFiles({ name: 'map.pcd', mimeType: 'application/vnd.pointclouds', buffer: pcd })
  await dialog.getByLabel('二维地图（PNG）').setInputFiles({ name: 'map.png', mimeType: 'image/png', buffer: png })
  await dialog.getByLabel('配准元数据（JSON）').setInputFiles({ name: 'map.json', mimeType: 'application/json', buffer: metadata })
  const createResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/maps') && response.request().method() === 'POST')
  await dialog.getByRole('button', { name: '添加地图' }).click()
  const createResponse = await createResponsePromise
  expect(createResponse.status()).toBe(201)
  mapId = (await createResponse.json() as { id: string }).id

  try {
    await expect(page.getByRole('row', { name: new RegExp(name) })).toBeVisible()
    await page.getByRole('row', { name: new RegExp(name) }).click()
    await expect(page).toHaveURL(new RegExp(`/maps/${mapId}$`))
    const image = page.getByRole('img', { name: `${name} 二维地图预览` })
    await expect(image).toBeVisible()
    await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(1)

    await page.getByRole('button', { name: '编辑名称' }).click()
    const renamed = `${name} renamed`
    await page.getByLabel('地图名称').fill(renamed)
    const renameResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/v1/maps/${mapId}`) && response.request().method() === 'PATCH')
    await page.getByRole('button', { name: '保存' }).click()
    expect((await renameResponsePromise).status()).toBe(200)
    await expect(page.getByRole('heading', { name: renamed })).toBeVisible()

    await page.getByRole('button', { name: `更多操作：${renamed}` }).click()
    await page.getByRole('menuitem', { name: '删除' }).click()
    const deleteDialog = page.getByRole('dialog', { name: `确认删除“${renamed}”？` })
    await expect(deleteDialog).toBeVisible()
    const deleteResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/v1/maps/${mapId}`) && response.request().method() === 'DELETE')
    await deleteDialog.getByRole('button', { name: '确认' }).click()
    expect((await deleteResponsePromise).status()).toBe(204)
    mapId = ''
    await expect(page).toHaveURL(/\/maps$/)
  } finally {
    if (mapId) await request.delete(`/api/v1/maps/${mapId}`)
  }
})

test('reports a protected map instead of deleting a referenced resource', async ({ page }) => {
  await page.goto('/maps/demo-wangfujing-map')
  await page.getByRole('button', { name: '更多操作：王府井站站厅' }).click()
  await page.getByRole('menuitem', { name: '删除' }).click()
  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/maps/demo-wangfujing-map') && response.request().method() === 'DELETE')
  await page.getByRole('dialog', { name: '确认删除“王府井站站厅”？' }).getByRole('button', { name: '确认' }).click()
  expect((await responsePromise).status()).toBe(409)
  await expect(page.getByText(/地图正被 1 个导览任务使用/)).toBeVisible()
  await expect(page).toHaveURL(/\/maps\/demo-wangfujing-map$/)
})

test('narrow screens preserve the map table columns with horizontal scrolling', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'This assertion applies only to the narrow viewport.')
  const name = `D3-03 narrow ${Date.now()}`
  const createResponse = await createTestMap(request, name)
  expect(createResponse.status()).toBe(201)
  const map = await createResponse.json() as { id: string }
  try {
    await page.goto('/maps')
    const table = page.getByRole('table', { name: '地图列表' })
    await expect(table).toBeVisible()
    expect(await table.evaluate((element) => element.scrollWidth > element.parentElement!.clientWidth)).toBe(true)
  } finally {
    expect((await request.delete(`/api/v1/maps/${map.id}`)).status()).toBe(204)
  }
})
