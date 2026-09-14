import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { createMapBundle } from './map-bundle'
import { demoPreview, demoRegistration } from '../../services/api/src/demo-data/demo-map'

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

const squareDemoMap = {
  id: 'demo-square-plan',
  name: '王府井站站厅',
  pcdFileName: 'wangfujing-station-hall.pcd',
  pcdEncoding: 'ascii',
  pcdSizeBytes: 24_000,
  previewAvailable: true,
  version: 1,
  createdAt: '2026-09-11T00:00:00.000Z',
  updatedAt: '2026-09-11T00:00:00.000Z',
  pcd: { fileName: 'wangfujing-station-hall.pcd', mediaType: 'application/octet-stream', sizeBytes: 24_000, checksumSha256: null, encoding: 'ascii' },
  preview: { fileName: 'wangfujing-station-hall.png', mediaType: 'image/png', sizeBytes: demoPreview.length, checksumSha256: null, url: '/api/v1/maps/demo-square-plan/preview', width: 960, height: 960 },
  registration: demoRegistration,
  referencedTaskCount: 0,
}

async function createTestMap(request: APIRequestContext, name: string) {
  return request.post('/api/v1/maps', {
    multipart: {
      name,
      bundle: {
        name: 'map.zip',
        mimeType: 'application/zip',
        buffer: createMapBundle([
          { name: 'map.pcd', value: pcd },
          { name: 'map.png', value: png },
          { name: 'map.json', value: metadata },
        ]),
      },
    },
  })
}

async function getReferencedMap(request: APIRequestContext) {
  const response = await request.get('/api/v1/maps')
  expect(response.ok()).toBeTruthy()
  const maps = await response.json() as { items: Array<{ id: string; name: string }> }
  const map = maps.items.find((item) => item.name === '王府井站站厅') ?? maps.items[0]
  expect(map).toBeTruthy()
  return map!
}

test('square demo map renders as a floor plan instead of a single point', async ({ page }) => {
  await page.route('**/api/v1/maps/demo-square-plan/preview', async (route) => {
    await route.fulfill({ contentType: 'image/png', body: demoPreview })
  })
  await page.route('**/api/v1/maps/demo-square-plan', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(squareDemoMap) })
  })

  await page.goto('/maps/demo-square-plan')

  const frame = page.locator('.map-preview-frame')
  const preview = page.getByRole('img', { name: '王府井站站厅 二维地图预览' })
  await expect(frame).toHaveClass(/is-square/)
  await expect(preview).toBeVisible()
  await expect.poll(() => preview.evaluate((element) => ({ width: (element as HTMLImageElement).naturalWidth, height: (element as HTMLImageElement).naturalHeight }))).toEqual({ width: 960, height: 960 })
})

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

test('map upload validates all required fields inline', async ({ page }) => {
  await page.goto('/maps')
  await page.getByRole('button', { name: '添加地图' }).click()
  const dialog = page.getByRole('dialog', { name: '添加地图' })

  await dialog.getByRole('button', { name: '确定' }).click()

  await expect(dialog.getByText('请输入地图名称。')).toBeVisible()
  await expect(dialog.getByText('请选择 .zip 地图包。')).toBeVisible()
  await expect(dialog.locator('.editor-field-error')).toHaveCount(2)
})

test('uploads a registered map bundle and completes detail management', async ({ page, request }, testInfo) => {
  const name = `D3-03 map ${testInfo.project.name} ${Date.now()}`
  let mapId = ''
  await page.goto('/maps')
  await page.getByRole('button', { name: '添加地图' }).first().click()
  const dialog = page.getByRole('dialog', { name: '添加地图' })
  await dialog.getByLabel('地图名称').fill(name)
  await dialog.getByLabel('地图文件').setInputFiles({
    name: 'map.zip',
    mimeType: 'application/zip',
    buffer: createMapBundle([
      { name: 'map.pcd', value: pcd },
      { name: 'map.png', value: png },
      { name: 'map.json', value: metadata },
    ]),
  })
  const createResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/maps') && response.request().method() === 'POST')
  await dialog.getByRole('button', { name: '确定' }).click()
  const createResponse = await createResponsePromise
  expect(createResponse.status()).toBe(201)
  mapId = (await createResponse.json() as { id: string }).id

  try {
    const row = page.getByRole('row', { name: new RegExp(name) })
    await expect(row).toBeVisible()
    await expect(row.getByRole('button', { name: `编辑 ${name}` })).toBeVisible()
    await expect(row.getByRole('button', { name: `删除 ${name}` })).toBeVisible()
    await row.click()
    await expect(page).toHaveURL(new RegExp(`/maps/${mapId}$`))
    const image = page.getByRole('img', { name: `${name} 二维地图预览` })
    await expect(image).toBeVisible()
    await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(1)

    await page.getByRole('button', { name: '编辑名称' }).click()
    const renameDialog = page.getByRole('dialog', { name: '编辑地图名称' })
    await expect(renameDialog).toBeVisible()
    const renamed = `${name} renamed`
    await renameDialog.getByLabel('地图名称').fill(renamed)
    const renameResponsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/v1/maps/${mapId}`) && response.request().method() === 'PATCH')
    await renameDialog.getByRole('button', { name: '保存' }).click()
    expect((await renameResponsePromise).status()).toBe(200)
    await expect(page.getByRole('heading', { name: renamed })).toBeVisible()
    await expect(page.locator('.map-section-heading > svg')).toHaveCount(0)

    await page.getByRole('button', { name: '删除', exact: true }).click()
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

test('reports a protected map instead of deleting a referenced resource', async ({ page, request }) => {
  const map = await getReferencedMap(request)
  await page.goto(`/maps/${map.id}`)
  await page.getByRole('button', { name: '删除', exact: true }).click()
  const responsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/v1/maps/${map.id}`) && response.request().method() === 'DELETE')
  await page.getByRole('dialog', { name: `确认删除“${map.name}”？` }).getByRole('button', { name: '确认' }).click()
  expect((await responsePromise).status()).toBe(409)
  await expect(page.getByText(/地图正被 \d+ 个导览任务使用/)).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`/maps/${map.id}$`))
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
