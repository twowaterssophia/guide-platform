import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

async function createTestPersona(request: APIRequestContext, name: string) {
  return request.post('/api/v1/personas', {
    data: {
      name,
      voice: 'female',
      prompt: '仅用于端到端交互回归。',
      presetSkillsEnabled: true,
      customSkills: [],
    },
  })
}

test('persona form uses a custom voice select and grouped skill popover', async ({ page }) => {
  await page.goto('/voice/personas/new')

  const voiceSelect = page.getByRole('button', { name: /音色 女声/ })
  await expect(voiceSelect).toHaveAttribute('aria-haspopup', 'listbox')
  await voiceSelect.click()
  const voiceOptions = page.getByRole('listbox')
  await expect(voiceOptions.getByRole('option', { name: '男声' })).toBeVisible()
  await voiceOptions.getByRole('option', { name: '男声' }).click()
  await expect(page.getByRole('button', { name: /音色 男声/ })).toBeVisible()

  const skillTrigger = page.getByRole('button', { name: '添加自定义技能' })
  await skillTrigger.click()
  const skillPicker = page.getByRole('dialog', { name: '选择自定义技能' })
  await expect(skillPicker.getByRole('heading', { name: '官方技能' })).toBeVisible()
  await expect(skillPicker.getByRole('heading', { name: '云端技能' })).toBeVisible()
  await expect.poll(async () => {
    const box = await skillPicker.boundingBox()
    const viewport = page.viewportSize()
    return Boolean(box && viewport && box.y >= 8 && box.y + box.height <= viewport.height - 8)
  }).toBe(true)
  await skillPicker.getByRole('checkbox').first().click()
  await expect(skillPicker.getByRole('checkbox').first()).toHaveAttribute('aria-checked', 'true')
  await skillPicker.getByRole('button', { name: '完成' }).click()
  await expect(skillPicker).toBeHidden()
  await expect(skillTrigger).toBeFocused()
  await skillTrigger.click()
  await page.keyboard.press('Escape')
  await expect(skillPicker).toBeHidden()
  await expect(skillTrigger).toBeFocused()
})

test('successful persona creation does not trigger the dirty-form guard', async ({ page, request }, testInfo) => {
  const name = `D3-02 save ${testInfo.project.name} ${Date.now()}`
  await page.goto('/voice/personas/new')
  await page.getByLabel('人设名称').fill(name)
  const createResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/personas') && response.request().method() === 'POST')
  await page.getByRole('button', { name: '创建人设' }).click()
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
  await page.getByLabel('人设名称').fill('未保存的人设')

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

test('custom personas expose actions from a more menu', async ({ page, request }, testInfo) => {
  const name = `D3-02 ${testInfo.project.name} ${Date.now()}`
  const createResponse = await createTestPersona(request, name)
  expect(createResponse.ok()).toBeTruthy()
  const persona = await createResponse.json() as { id: string }

  try {
    await page.goto('/voice/personas')
    const menuTrigger = page.getByRole('button', { name: `更多操作：${name}` })
    await menuTrigger.click()
    const menu = page.getByRole('menu', { name: `${name} 的更多操作` })
    await expect(menu.getByRole('menuitem', { name: '编辑' })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: '删除' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
    await expect(menuTrigger).toBeFocused()

    await page.getByRole('row', { name: new RegExp(name) }).click()
    await expect(page.getByRole('button', { name: '编辑' })).toBeVisible()
    await expect(page.getByRole('button', { name: '删除人设' })).toHaveCount(0)
    await page.getByRole('button', { name: `更多操作：${name}` }).click()
    const detailDelete = page.getByRole('menu', { name: `${name} 的更多操作` }).getByRole('menuitem', { name: '删除' })
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
