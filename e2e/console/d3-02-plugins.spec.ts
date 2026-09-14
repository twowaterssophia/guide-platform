import { expect, test } from '@playwright/test'

test('plugin empty state uses the legacy plug illustration and starts creation from a page', async ({ page }) => {
  await page.route('**/api/v1/mcp-plugins', async (route) => {
    if (route.request().method() === 'GET') await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: [] }) })
    else await route.continue()
  })
  await page.goto('/voice/plugins')

  await expect(page.getByRole('heading', { name: '暂无插件' })).toBeVisible()
  await expect(page.locator('.plugin-empty-icon svg path')).toBeVisible()
  await expect(page.getByRole('button', { name: '添加插件' })).toHaveCount(1)

  await page.getByRole('button', { name: '添加插件' }).click()
  await expect(page).toHaveURL('/voice/plugins/new')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByLabel('插件名称')).toBeVisible()
  await expect(page.getByLabel('MCP 服务地址')).toBeVisible()
})

test('plugin form validates all required fields inline in one submission', async ({ page }) => {
  await page.goto('/voice/plugins/new')

  await page.getByRole('button', { name: '保存' }).click()

  await expect(page.getByText('请输入插件名称。')).toBeVisible()
  await expect(page.getByText('请输入 MCP 服务地址。')).toBeVisible()
  await expect(page.getByText('请输入插件描述。')).toBeVisible()
  await expect(page.getByText('请输入识别示例。')).toBeVisible()
  await expect(page.locator('.editor-field-error')).toHaveCount(4)
  await expect(page.getByLabel('插件名称')).toHaveAttribute('aria-invalid', 'true')

  const [formBox, surfaceBox] = await Promise.all([
    page.locator('.plugin-form').boundingBox(),
    page.locator('.plugin-form-surface').boundingBox(),
  ])
  const horizontalPadding = await page.locator('.plugin-form-surface').evaluate((element) => {
    const style = getComputedStyle(element)
    return Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight)
  })
  expect(formBox).not.toBeNull()
  expect(surfaceBox).not.toBeNull()
  expect(formBox!.width).toBe(surfaceBox!.width - horizontalPadding)
})

test('plugin authentication uses a custom select and keeps fields vertically stacked', async ({ page }) => {
  await page.goto('/voice/plugins/new')

  const authSelect = page.getByRole('button', { name: /认证方式 不需要认证/ })
  await expect(authSelect).toHaveAttribute('aria-haspopup', 'listbox')
  await authSelect.click()
  await page.getByRole('listbox').getByRole('option', { name: 'API Key' }).click()
  await expect(page.getByLabel('请求头名称')).toBeVisible()
  const apiKeyInput = page.getByRole('textbox', { name: 'API Key' })
  await expect(apiKeyInput).toBeVisible()

  const headerBox = await page.getByLabel('请求头名称').boundingBox()
  const keyBox = await apiKeyInput.boundingBox()
  expect(headerBox?.y).toBeLessThan(keyBox?.y ?? 0)
})

test('plugin list exposes the same direct action controls as other lists', async ({ page }) => {
  await page.route('**/api/v1/mcp-plugins', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: [{ id: 'demo-plugin', name: '演示插件', serverUrl: 'https://example.com/mcp', description: '', recognitionExamples: [], authType: 'NONE', authConfig: null, tools: [], createdAt: '2026-09-11T00:00:00.000Z', updatedAt: '2026-09-11T00:00:00.000Z', lastRefreshedAt: null, version: 1 }] }) })
    } else await route.continue()
  })
  await page.goto('/voice/plugins')

  const row = page.getByRole('row', { name: /演示插件/ })
  await expect(row.getByRole('button', { name: '刷新 演示插件' })).toBeVisible()
  await expect(row.getByRole('button', { name: '编辑 演示插件' })).toBeVisible()
  await expect(row.getByRole('button', { name: '删除 演示插件' })).toBeVisible()
})
