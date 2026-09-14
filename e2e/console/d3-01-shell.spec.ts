import { expect, test } from '@playwright/test'

test('GUIDE HUB brand returns to the tour task list', async ({ page }) => {
  await page.goto('/maps')

  const brand = page.getByRole('link', { name: '导览后台首页' })
  await expect(brand.locator('.brand-name')).toHaveText('GUIDE HUB')
  await expect(brand.locator('.brand-subtitle')).toHaveCount(0)
  await brand.click()
  await expect(page).toHaveURL(/\/tour-tasks$/)
})

test('voice routes provide a persistent secondary navigation', async ({ page }) => {
  await page.goto('/voice/personas')

  const subnav = page.getByRole('navigation', { name: '语音功能' })
  await expect(subnav).toBeVisible()
  await expect(subnav.getByRole('link', { name: '人设' })).toHaveAttribute('aria-current', 'page')
  await expect(subnav.getByRole('link', { name: '插件' })).toBeVisible()
})

test('persona and plugin editor routes use their own full-page layout', async ({ page }) => {
  for (const path of ['/voice/personas/new', '/voice/plugins/new']) {
    await page.goto(path)
    await expect(page.getByRole('navigation', { name: '语音功能' })).toHaveCount(0)
    await expect(page.locator('.page-section')).toBeVisible()
  }
})

test('map, persona, and task empty states reuse the legacy illustrations', async ({ page }) => {
  await page.route('**/api/v1/maps', async (route) => {
    if (route.request().method() === 'GET') await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: [] }) })
    else await route.continue()
  })
  await page.route('**/api/v1/personas', async (route) => {
    if (route.request().method() === 'GET') await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: [{ id: '__system_default__', name: '默认', voice: 'female', isSystemDefault: true, version: 1, createdAt: '2026-09-11T00:00:00.000Z', updatedAt: '2026-09-11T00:00:00.000Z' }] }) })
    else await route.continue()
  })
  await page.route('**/api/v1/tour-tasks', async (route) => {
    if (route.request().method() === 'GET') await route.fulfill({ contentType: 'application/json', body: '[]' })
    else await route.continue()
  })

  await page.goto('/voice/personas')
  await expect(page.locator('.legacy-empty-illustration-persona')).toBeVisible()
  await expect(page.locator('.page-heading').getByRole('button', { name: '新建人设' })).toHaveCount(0)
  const personaAction = page.locator('.guide-empty').getByRole('button', { name: '新建人设' })
  await expect(personaAction).toBeVisible()
  await personaAction.click()
  await expect(page).toHaveURL(/\/voice\/personas\/new$/)
  await page.goto('/maps')
  await expect(page.locator('.legacy-empty-illustration-map')).toBeVisible()
  await expect(page.locator('.page-heading').getByRole('button', { name: '添加地图' })).toHaveCount(0)
  const mapAction = page.locator('.guide-empty').getByRole('button', { name: '添加地图' })
  await expect(mapAction).toBeVisible()
  await mapAction.click()
  await expect(page.getByRole('dialog', { name: '添加地图' })).toBeVisible()
  await page.getByRole('button', { name: '关闭' }).click()
  await page.goto('/tour-tasks')
  await expect(page.locator('.legacy-empty-illustration-tour')).toBeVisible()
  await expect(page.locator('.page-heading').getByRole('button', { name: '新建导览任务' })).toHaveCount(0)
  const taskAction = page.locator('.guide-empty').getByRole('button', { name: '新建导览任务' })
  await expect(taskAction).toBeVisible()
  await taskAction.click()
  await expect(page).toHaveURL(/\/tour-tasks\/new$/)
})

test('account popover closes with Escape and restores focus', async ({ page }) => {
  await page.goto('/tour-tasks')

  const trigger = page.getByRole('button', { name: '打开账号菜单' })
  await trigger.click()
  const menu = page.getByRole('menu', { name: '账号菜单' })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: '操作手册' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: '重置演示数据' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('demo reset requires confirmation before sending its request', async ({ page }) => {
  let resetRequested = false
  await page.route('**/api/v1/demo/reset', async (route) => {
    resetRequested = true
    await route.fulfill({ status: 204 })
  })
  await page.goto('/tour-tasks')
  await page.getByRole('button', { name: '打开账号菜单' }).click()
  await page.getByRole('menuitem', { name: '重置演示数据' }).click()

  const dialog = page.getByRole('dialog', { name: '重置演示数据？' })
  await expect(dialog).toBeVisible()
  await expect(resetRequested).toBe(false)
  await dialog.getByRole('button', { name: '取消' }).click()
  await expect(resetRequested).toBe(false)
})

test('dangerous task deletion cannot be dismissed with Escape', async ({ page }) => {
  await page.goto('/tour-tasks')

  await page.getByRole('button', { name: '删除 王府井站站厅巡检' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: '关闭' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  await page.locator('.guide-modal-backdrop').click({ position: { x: 1, y: 1 } })
  await expect(dialog).toBeVisible()
})

test('narrow screens scroll tables instead of squeezing columns', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'This assertion applies only to the narrow viewport.')
  const name = `D3-01 responsive ${Date.now()}`
  const createResponse = await request.post('/api/v1/personas', {
    data: {
      name,
      voice: 'female',
      prompt: '仅用于移动端表格回归。',
      presetSkillsEnabled: true,
    },
  })
  expect(createResponse.ok()).toBeTruthy()
  const persona = await createResponse.json() as { id: string }

  try {
    await page.goto('/voice/personas')

    const table = page.getByRole('table', { name: '人设列表' })
    await expect(table).toBeVisible()
    expect(await table.evaluate((element) => element.scrollWidth > element.parentElement!.clientWidth)).toBe(true)
  } finally {
    const deleteResponse = await request.delete(`/api/v1/personas/${persona.id}`)
    expect(deleteResponse.status()).toBe(204)
  }
})

test('core D3-01 routes render without console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))

  for (const path of ['/tour-tasks', '/voice/personas', '/maps']) {
    await page.goto(path)
    await expect(page.getByRole('main')).toBeVisible()
  }

  expect(errors).toEqual([])
})
