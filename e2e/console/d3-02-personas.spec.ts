import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

async function createTestPersona(request: APIRequestContext, name: string) {
  return request.post('/api/v1/personas', {
    data: {
      name,
      voice: 'female',
      prompt: '仅用于端到端交互回归。',
      presetSkillsEnabled: true,
    },
  })
}

test('persona form uses a custom voice select and gesture switch', async ({ page }) => {
  await page.goto('/voice/personas/new')

  const [sectionBox, inputBox] = await Promise.all([
    page.locator('.persona-form-section').first().boundingBox(),
    page.getByLabel('名称').boundingBox(),
  ])
  const sectionPadding = await page.locator('.persona-form-section').first().evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingLeft))
  expect(sectionBox).not.toBeNull()
  expect(inputBox).not.toBeNull()
  expect(Math.abs(inputBox!.width - (sectionBox!.width - sectionPadding * 2))).toBeLessThan(2)

  const voiceSelect = page.getByRole('button', { name: /音色 女声/ })
  await expect(voiceSelect).toHaveAttribute('aria-haspopup', 'listbox')
  await voiceSelect.click()
  const voiceOptions = page.getByRole('listbox')
  await expect(voiceOptions.getByRole('option', { name: '男声' })).toBeVisible()
  await voiceOptions.getByRole('option', { name: '男声' }).click()
  await expect(page.getByRole('button', { name: /音色 男声/ })).toBeVisible()

  await expect(page.getByRole('heading', { name: '手势动作' })).toBeVisible()
  const gestureSwitch = page.getByRole('checkbox', { name: '启用手势动作' })
  await expect(gestureSwitch).toBeChecked()
  await gestureSwitch.click()
  await expect(gestureSwitch).not.toBeChecked()
})

test('persona prompt grows with content and required fields validate inline', async ({ page }) => {
  await page.goto('/voice/personas/new')

  const prompt = page.getByLabel('提示词（可选）')
  await expect(prompt).toHaveAttribute('placeholder', '请输入机器人回答问题时需要遵循的规则')
  const initialHeight = (await prompt.boundingBox())!.height
  await prompt.fill(Array.from({ length: 8 }, (_, index) => `第 ${index + 1} 行提示词`).join('\n'))
  expect((await prompt.boundingBox())!.height).toBeGreaterThan(initialHeight)

  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('请输入人设名称。')).toBeVisible()
  await expect(page.getByLabel('名称')).toHaveAttribute('aria-invalid', 'true')
})

test('persona plugins use the reusable multi-select dialog with descriptions', async ({ page }) => {
  await page.route('**/api/v1/mcp-plugins', async (route) => {
    if (route.request().method() === 'GET') await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: [
      { id: 'knowledge', name: '站内知识库', description: '覆盖站内导览与服务信息。', tools: [], createdAt: '2026-09-11T00:00:00.000Z', lastRefreshedAt: null },
      { id: 'service', name: '服务查询', description: '查询乘客服务相关信息。', tools: [], createdAt: '2026-09-11T00:00:00.000Z', lastRefreshedAt: null },
    ] }) })
    else await route.continue()
  })
  await page.goto('/voice/personas/new')

  const picker = page.locator('.persona-plugin-trigger')
  await expect(page.locator('.persona-plugin-field')).toHaveCSS('margin-top', '28px')
  await expect(page.locator('.persona-plugin-select')).toHaveCSS('row-gap', '14px')
  await expect(picker).toHaveText('选择插件')
  await picker.click()
  const dialog = page.getByRole('dialog', { name: '选择插件' })
  await expect(dialog.getByText('覆盖站内导览与服务信息。')).toBeVisible()
  await dialog.getByRole('option', { name: /站内知识库/ }).click()
  await dialog.getByRole('option', { name: /服务查询/ }).click()
  await expect(dialog.getByRole('option', { name: /站内知识库/ })).toHaveAttribute('aria-selected', 'true')
  await dialog.getByRole('button', { name: '确定' }).click()
  await expect(page.locator('.persona-plugin-selection-item')).toHaveText(['站内知识库', '服务查询'])
  await expect(picker).toHaveText('管理插件')
  await expect(dialog).toHaveCount(0)
})

test('successful persona creation does not trigger the dirty-form guard', async ({ page, request }, testInfo) => {
  const name = `D3-02 save ${testInfo.project.name} ${Date.now()}`
  await page.goto('/voice/personas/new')
  await page.getByLabel('名称').fill(name)
  const createResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/personas') && response.request().method() === 'POST')
  await page.getByRole('button', { name: '保存' }).click()
  const createResponse = await createResponsePromise
  expect(createResponse.ok()).toBeTruthy()
  const persona = await createResponse.json() as { id: string }

  try {
    await expect(page).toHaveURL(/\/voice\/personas\/[^/]+$/)
    await expect(page.getByRole('heading', { name })).toBeVisible()
    await expect(page.getByRole('dialog', { name: '放弃未保存的修改？' })).toHaveCount(0)
  } finally {
    const deleteResponse = await request.delete(`/api/v1/personas/${persona.id}`)
    expect(deleteResponse.status()).toBe(204)
  }
})

test('dirty persona form requires a decision before leaving', async ({ page }) => {
  await page.goto('/voice/personas/new')
  await page.getByLabel('名称').fill('未保存的人设')

  await page.getByRole('link', { name: '地图' }).click()
  const dialog = page.getByRole('dialog', { name: '放弃未保存的修改？' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: '继续编辑' }).click()
  await expect(page).toHaveURL(/\/voice\/personas\/new$/)

  await page.getByRole('link', { name: '地图' }).click()
  await page.getByRole('dialog', { name: '放弃未保存的修改？' }).getByRole('button', { name: '放弃修改' }).click()
  await expect(page).toHaveURL(/\/maps$/)
})

test('custom personas expose list actions and protected detail deletion', async ({ page, request }, testInfo) => {
  const name = `D3-02 ${testInfo.project.name} ${Date.now()}`
  const createResponse = await createTestPersona(request, name)
  expect(createResponse.ok()).toBeTruthy()
  const persona = await createResponse.json() as { id: string }

  try {
    await page.goto('/voice/personas')
    const row = page.getByRole('row', { name: new RegExp(name) })
    await expect(row.getByRole('button', { name: `编辑 ${name}` })).toBeVisible()
    await expect(row.getByRole('button', { name: `删除 ${name}` })).toBeVisible()

    await row.click()
    await expect(page.getByRole('button', { name: '编辑', exact: true })).toBeVisible()
    const detailDelete = page.getByRole('button', { name: '删除', exact: true })
    await expect(detailDelete).toBeVisible()
    await detailDelete.click()
    const deleteDialog = page.getByRole('dialog', { name: `确认删除“${name}”？` })
    await expect(deleteDialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(deleteDialog).toBeVisible()
    await deleteDialog.getByRole('button', { name: '取消' }).click()
  } finally {
    const deleteResponse = await request.delete(`/api/v1/personas/${persona.id}`)
    expect(deleteResponse.status()).toBe(204)
  }
})
