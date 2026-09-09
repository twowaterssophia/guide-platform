import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

async function deleteTask(request: APIRequestContext, taskId: string) {
  const response = await request.delete(`/api/v1/tour-tasks/${taskId}`)
  expect([204, 404]).toContain(response.status())
}

test('creates a task through the real three-step editor', async ({ page, request }, testInfo) => {
  const name = `D3-04 editor ${testInfo.project.name} ${Date.now()}`
  let taskId = ''

  await page.goto('/tour-tasks/new')
  await page.getByLabel('任务名称').fill(name)
  await page.getByRole('button', { name: /地图，.*请选择地图/ }).click()
  await page.getByRole('option', { name: '王府井站站厅' }).click()
  await page.getByRole('button', { name: '下一步' }).click()

  await expect(page.getByRole('heading', { name: '点位设置' })).toBeVisible()
  const canvas = page.locator('.task-map-canvas')
  await page.getByRole('button', { name: '添加点位' }).click()
  await canvas.click({ position: { x: 120, y: 90 } })
  await page.getByRole('button', { name: '添加点位' }).click()
  await canvas.click({ position: { x: 280, y: 160 } })
  await expect(page.getByText('2 个点位', { exact: true })).toBeVisible()

  const pointRows = page.locator('.task-point-edit-row')
  await pointRows.nth(0).getByLabel('点位名称').fill('入口')
  await pointRows.nth(1).getByLabel('点位名称').fill('展项')
  await pointRows.nth(1).dragTo(pointRows.nth(0))
  await expect(pointRows.nth(0).getByLabel('点位名称')).toHaveValue('展项')
  await expect(pointRows.nth(1).getByLabel('点位名称')).toHaveValue('入口')
  if (testInfo.project.name === 'mobile') {
    const yInput = await pointRows.nth(0).getByLabel('Y', { exact: true }).boundingBox()
    expect(yInput?.width).toBeGreaterThan(100)
  }
  await page.getByRole('button', { name: '下一步' }).click()

  await expect(page.getByRole('heading', { name: '动作编排' })).toBeVisible()
  const actionMenus = page.locator('.task-action-menu')
  await actionMenus.nth(0).getByRole('button', { name: '添加任务' }).click()
  await page.getByRole('menuitem', { name: '语音播报' }).click()
  await page.getByLabel('语音播报内容').fill('欢迎来到展厅。')
  await actionMenus.nth(0).getByRole('button', { name: '添加任务' }).click()
  await page.getByRole('menuitem', { name: '语音问答' }).click()
  await page.getByLabel('语音问答内容').fill('需要帮助吗？')
  const actionRows = page.locator('.task-edit-action-row')
  await expect(actionRows).toHaveCount(2)
  await actionRows.nth(1).dragTo(actionRows.nth(0))
  await expect(page.getByRole('button', { name: '保存草稿' })).toBeEnabled()

  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/tour-tasks') && response.request().method() === 'POST')
  await page.getByRole('button', { name: '保存草稿' }).click()
  const response = await responsePromise
  expect(response.status()).toBe(201)
  taskId = (await response.json() as { id: string }).id

  try {
    await expect(page).toHaveURL(new RegExp(`/tour-tasks/${taskId}$`))
    await expect(page.getByRole('heading', { name })).toBeVisible()
    await expect(page.getByText('入口', { exact: true })).toBeVisible()
    await expect(page.getByText('展项', { exact: true })).toBeVisible()
    const savedPoints = page.locator('.task-point-card')
    await expect(savedPoints.nth(0).getByRole('heading')).toContainText('展项')
    await expect(savedPoints.nth(1).getByRole('heading')).toContainText('入口')
    const savedActions = page.locator('.task-action-list .task-action-row')
    await expect(savedActions).toHaveCount(2)
    await expect(savedActions.nth(0)).toContainText('语音问答')
    await expect(savedActions.nth(0)).toContainText('需要帮助吗？')
    await expect(savedActions.nth(1)).toContainText('语音播报')
    await expect(savedActions.nth(1)).toContainText('欢迎来到展厅。')
  } finally {
    if (taskId) await deleteTask(request, taskId)
  }
})

test('task editor protects an unsaved draft and remains readable on mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'This assertion applies only to the narrow viewport.')
  await page.goto('/tour-tasks/new')
  await page.getByLabel('任务名称').fill(`D3-04 draft ${Date.now()}`)
  await page.getByRole('button', { name: '返回任务列表' }).click()
  await expect(page.getByRole('dialog', { name: '放弃未保存的修改？' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: '放弃未保存的修改？' })).toBeVisible()
  await page.getByRole('button', { name: '继续编辑' }).click()
  await expect(page.getByRole('heading', { name: '新建导览任务' })).toBeVisible()
  await expect(page.locator('.task-editor-card')).toHaveCSS('max-width', 'none')
})

test('opens the stable edit URL, hydrates existing structure, and persists a versioned update', async ({ page, request }, testInfo) => {
  const name = `D3-04 edit ${testInfo.project.name} ${Date.now()}`
  const task = await createTaskFixture(request, name)
  try {
    await page.goto(`/tour-tasks/${task.id}/edit`)
    await expect(page).toHaveURL(new RegExp(`/tour-tasks/${task.id}/edit$`))
    await expect(page.getByRole('heading', { name: '编辑导览任务' })).toBeVisible()
    await expect(page.getByRole('button', { name: /地图，王府井站站厅/ })).toBeVisible()
    await page.getByRole('button', { name: '下一步' }).click()
    await expect(page.getByText('2 个点位', { exact: true })).toBeVisible()
    await page.locator('.task-point-edit-row').nth(0).getByLabel('朝向').fill('45')
    await page.getByRole('button', { name: '下一步' }).click()
    await page.getByLabel('语音播报内容').fill('编辑后的播报。')

    const responsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/v1/tour-tasks/${task.id}`) && response.request().method() === 'PATCH')
    await page.getByRole('button', { name: '保存草稿' }).click()
    expect((await responsePromise).status()).toBe(200)
    await expect(page).toHaveURL(new RegExp(`/tour-tasks/${task.id}$`))
    await expect(page.getByText('编辑后的播报。', { exact: true })).toBeVisible()
    await expect(page.getByText('v2', { exact: true })).toBeVisible()
  } finally {
    await deleteTask(request, task.id)
  }
})

async function createTaskFixture(request: APIRequestContext, name: string) {
  const response = await request.post('/api/v1/tour-tasks', {
    data: {
      name,
      mapId: 'demo-wangfujing-map',
      personaId: '__system_default__',
      points: [
        { key: 'one', name: '点位一', x: 100, y: 100, angle: 0, actions: [{ type: 'SPEECH', narration: '原始播报。' }] },
        { key: 'two', name: '点位二', x: 300, y: 200, angle: 180, actions: [] },
      ],
      paths: [{ fromPointKey: 'one', toPointKey: 'two', actions: [] }],
    },
  })
  expect(response.status()).toBe(201)
  return response.json() as Promise<{ id: string }>
}
