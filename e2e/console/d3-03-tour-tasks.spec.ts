import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

const longNarration = '请跟随机器人前往下一处展项，途中注意脚下，并在到达后依次了解展品的背景、设计思路和实际应用。'

async function createTestTask(request: APIRequestContext, name: string) {
  const mapsResponse = await request.get('/api/v1/maps')
  expect(mapsResponse.ok()).toBeTruthy()
  const maps = await mapsResponse.json() as { items: Array<{ id: string }> }
  expect(maps.items.length).toBeGreaterThan(0)

  const response = await request.post('/api/v1/tour-tasks', {
    data: {
      name,
      mapId: (maps.items.find((item) => item.name === '王府井站站厅') ?? maps.items[0])!.id,
      personaId: '__system_default__',
      points: [
        {
          key: 'service-desk',
          name: '站厅服务台',
          x: 210,
          y: 322,
          angle: 90,
          actions: [
            { type: 'SPEECH', narration: longNarration },
            { type: 'SKILL', skillId: 'official-handshake' },
          ],
        },
        {
          key: 'pis-screen',
          name: '站厅 PIS 屏',
          x: 492,
          y: 220,
          angle: 0,
          actions: [{ type: 'INTERACTION', interactionPrompt: '您还想了解哪些信息？' }],
        },
      ],
      paths: [{
        fromPointKey: 'service-desk',
        toPointKey: 'pis-screen',
        actions: [{ type: 'SPEECH', narration: '正在前往站厅 PIS 屏。' }],
      }],
    },
  })
  expect(response.status()).toBe(201)
  return response.json() as Promise<{ id: string }>
}

test('opens a task in an independent detail page and renders ordered actions', async ({ page, request }, testInfo) => {
  const name = `D3-03 task detail ${testInfo.project.name} ${Date.now()}`
  const task = await createTestTask(request, name)
  try {
    await page.goto('/tour-tasks')
    await page.getByRole('row', { name: `查看任务 ${name}` }).click()

    await expect(page).toHaveURL(new RegExp(`/tour-tasks/${task.id}$`))
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible()
    await expect(page.getByText('王府井站站厅', { exact: true })).toBeVisible()
    await expect(page.getByText('默认', { exact: true })).toBeVisible()
    const taskCards = page.locator('.task-point-card')
    await expect(taskCards.nth(0).getByRole('heading')).toHaveText('站厅服务台')
    await expect(taskCards.nth(1).getByRole('heading')).toHaveText('站厅服务台→站厅 PIS 屏')
    await expect(page.getByText(longNarration)).toBeVisible()
    await expect(page.getByText('握手', { exact: true })).toBeVisible()
    await expect(page.getByText('正在前往站厅 PIS 屏。')).toBeVisible()
    await expect(page.getByText('您还想了解哪些信息？')).toBeVisible()
  } finally {
    await request.delete(`/api/v1/tour-tasks/${task.id}`)
  }
})

test('deletes a task from the list without opening its detail page', async ({ page, request }, testInfo) => {
  const name = `D3-03 task delete ${testInfo.project.name} ${Date.now()}`
  const task = await createTestTask(request, name)
  let deleted = false
  try {
    await page.goto('/tour-tasks')
    await page.getByRole('button', { name: `删除 ${name}` }).click()

    const dialog = page.getByRole('dialog', { name: `确认删除“${name}”？` })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    const responsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/v1/tour-tasks/${task.id}`) && response.request().method() === 'DELETE')
    await dialog.getByRole('button', { name: '确认' }).click()
    expect((await responsePromise).status()).toBe(204)
    deleted = true

    await expect(page.getByText('任务已删除')).toBeVisible()
    await expect(page.getByRole('row', { name: `查看任务 ${name}` })).toBeHidden()
    await expect(page).toHaveURL(/\/tour-tasks$/)
  } finally {
    if (!deleted) await request.delete(`/api/v1/tour-tasks/${task.id}`)
  }
})

test('task list renders weakly separated pages of ten records', async ({ page }) => {
  const tasks = Array.from({ length: 11 }, (_, index) => ({
    id: `task-${index + 1}`,
    name: `分页任务 ${index + 1}`,
    mapName: '王府井站站厅',
    pointCount: index + 1,
    version: 1,
    createdAt: '2026-09-11T00:00:00.000Z',
    updatedAt: '2026-09-11T00:00:00.000Z',
  }))
  await page.route('**/api/v1/tour-tasks', async (route) => {
    if (route.request().method() === 'GET') await route.fulfill({ contentType: 'application/json', body: JSON.stringify(tasks) })
    else await route.continue()
  })
  await page.goto('/tour-tasks')

  const rows = page.locator('.guide-table-body .guide-table-row')
  await expect(rows).toHaveCount(10)
  await expect(rows.first().locator('.guide-table-cell').first()).toHaveCSS('border-bottom-color', 'rgb(240, 240, 242)')
  await expect(rows.last().locator('.guide-table-cell').first()).toHaveCSS('border-bottom-width', '0px')
  await page.getByRole('button', { name: '下一页' }).click()
  await expect(rows).toHaveCount(1)
  await expect(rows).toContainText('分页任务 11')
  await expect(rows.locator('.guide-table-cell').first()).toHaveCSS('border-bottom-width', '0px')
})
