import { expect, test } from '@playwright/test'

for (const legacy of [false, true]) {
  test(`${legacy ? 'legacy' : 'new'} task without voice actions saves with the default persona`, async ({ page, request }, testInfo) => {
    const maps = await (await request.get('/api/v1/maps')).json() as { items: Array<{ id: string; name: string }> }
    const map = maps.items[0]!
    const name = `Required persona ${legacy ? 'legacy' : 'new'} ${testInfo.project.name} ${Date.now()}`
    let taskId = ''
    try {
      if (legacy) {
        const response = await request.post('/api/v1/tour-tasks', {
          data: { name, mapId: map.id, personaId: null, points: [{ key: 'one', name: '入口', x: 100, y: 100, angle: 0, actions: [] }], paths: [] },
        })
        expect(response.status()).toBe(201)
        const task = await response.json() as { id: string }
        taskId = task.id
        await page.route(`**/api/v1/tour-tasks/${taskId}`, async (route) => {
          if (route.request().method() !== 'GET') return route.continue()
          await route.fulfill({ json: { ...task, persona: null } })
        })
        await page.goto(`/tour-tasks/${taskId}/edit`)
      } else {
        await page.goto('/tour-tasks/new')
        await page.getByLabel('任务名称').fill(name)
        await page.getByRole('button', { name: /地图，.*请选择地图/ }).click()
        await page.getByRole('option', { name: map.name, exact: true }).click()
      }
      await page.getByRole('button', { name: '下一步' }).click()
      if (!legacy) {
        await page.getByRole('button', { name: '添加点位' }).click()
        await page.locator('.task-map-canvas').click({ position: { x: 120, y: 90 } })
      }
      await page.getByRole('button', { name: '下一步' }).click()
      const picker = page.getByRole('button', { name: '选择语音人设' })
      await expect(picker).toHaveText('默认')
      await picker.click()
      await expect(page.getByRole('option', { name: '不设置人设' })).toHaveCount(0)
      await expect(page.getByRole('option', { name: '默认', exact: true })).toHaveAttribute('aria-selected', 'true')
      await page.getByRole('option', { name: '默认', exact: true }).click()
      const savedResponse = page.waitForResponse((response) => response.url().includes('/api/v1/tour-tasks') && response.request().method() === (legacy ? 'PATCH' : 'POST'))
      await page.getByRole('button', { name: '保存', exact: true }).click()
      const response = await savedResponse
      expect(response.status()).toBe(legacy ? 200 : 201)
      expect(response.request().postDataJSON().personaId).toBeTruthy()
      const saved = await response.json() as { id: string; persona: { isSystemDefault: boolean } }
      taskId = saved.id
      expect(saved.persona.isSystemDefault).toBe(true)
      await expect(page).toHaveURL(new RegExp(`/tour-tasks/${taskId}$`))
    } finally {
      if (taskId) expect((await request.delete(`/api/v1/tour-tasks/${taskId}`)).status()).toBe(204)
    }
  })
}

test('an unavailable persona list prevents saving a task', async ({ page }) => {
  await page.route('**/api/v1/personas*', (route) => route.fulfill({ json: { items: [] } }))
  await page.goto('/tour-tasks/new')
  await page.getByLabel('任务名称').fill('Missing persona')
  await page.getByRole('button', { name: /地图，.*请选择地图/ }).click()
  await page.getByRole('option').first().click()
  await page.getByRole('button', { name: '下一步' }).click()
  await page.getByRole('button', { name: '添加点位' }).click()
  await page.locator('.task-map-canvas').click({ position: { x: 120, y: 90 } })
  await page.getByRole('button', { name: '下一步' }).click()
  await expect(page.getByRole('button', { name: '选择语音人设' })).toHaveText('请选择语音人设')
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
})
