import { expect, test } from '@playwright/test'

test('voice routes provide a persistent secondary navigation', async ({ page }) => {
  await page.goto('/voice/personas')

  const subnav = page.getByRole('navigation', { name: '语音功能' })
  await expect(subnav).toBeVisible()
  await expect(subnav.getByRole('link', { name: '人设' })).toHaveAttribute('aria-current', 'page')
  await expect(subnav.getByRole('link', { name: '插件' })).toBeVisible()
})

test('account popover closes with Escape and restores focus', async ({ page }) => {
  await page.goto('/tour-tasks')

  const trigger = page.getByRole('button', { name: '打开账号菜单' })
  await trigger.click()
  await expect(page.getByRole('menu', { name: '账号菜单' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu', { name: '账号菜单' })).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('dangerous task deletion cannot be dismissed with Escape', async ({ page }) => {
  await page.goto('/tour-tasks')

  await page.getByRole('button', { name: /更多操作：/ }).click()
  await page.getByRole('menuitem', { name: '删除' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: '关闭' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  await page.locator('.guide-modal-backdrop').click({ position: { x: 1, y: 1 } })
  await expect(dialog).toBeVisible()
})

test('narrow screens scroll tables instead of squeezing columns', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'This assertion applies only to the narrow viewport.')
  await page.goto('/voice/personas')

  const table = page.getByRole('table', { name: '人设列表' })
  await expect(table).toBeVisible()
  expect(await table.evaluate((element) => element.scrollWidth > element.parentElement!.clientWidth)).toBe(true)
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
