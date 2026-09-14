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
  const mapTrigger = page.getByRole('button', { name: /地图，.*请选择地图/ })
  await expect(mapTrigger).toHaveAttribute('aria-haspopup', 'listbox')
  await expect(mapTrigger).toHaveClass(/is-placeholder/)
  await expect(mapTrigger).toHaveCSS('color', 'rgb(138, 138, 138)')
  await expect(page.getByLabel('任务名称')).toHaveCSS('font-size', '16px')
  expect(await page.getByLabel('任务名称').evaluate((element) => getComputedStyle(element, '::placeholder').fontSize)).toBe('16px')
  await mapTrigger.click()
  await expect(page.getByText('wangfujing-station-hall.pcd', { exact: true })).toHaveCount(0)
  await page.getByRole('option', { name: '王府井站站厅' }).click()
  await page.getByRole('button', { name: '下一步' }).click()

  await expect(page.getByRole('heading', { name: '配置点位' })).toBeVisible()
  await expect(page.getByText('暂无点位', { exact: true })).toBeVisible()
  await expect(page.locator('.task-point-edit-header')).toHaveCount(0)
  const canvas = page.locator('.task-map-canvas')
  await page.getByRole('button', { name: '添加点位' }).click()
  await canvas.click({ position: { x: 120, y: 90 } })
  await page.getByRole('button', { name: '添加点位' }).click()
  await canvas.click({ position: { x: 280, y: 160 } })
  await expect(page.getByText('2 个点位', { exact: true })).toBeVisible()
  await expect(page.getByText('名称', { exact: true })).toHaveCount(1)
  await expect(page.getByText('X 坐标', { exact: true })).toHaveCount(1)
  await expect(page.getByText('Y 坐标', { exact: true })).toHaveCount(1)
  await expect(page.getByText('朝向', { exact: true })).toHaveCount(1)

  const pointRows = page.locator('.task-point-edit-row')
  await expect(pointRows.last()).toHaveCSS('border-bottom-width', '0px')
  await pointRows.nth(0).getByLabel('点位名称').fill('入口')
  await pointRows.nth(1).getByLabel('点位名称').fill('展项')
  const sourceHandle = pointRows.nth(1).getByRole('button', { name: /拖动调整.*顺序/ })
  await sourceHandle.dragTo(pointRows.nth(0))
  await expect(pointRows.nth(0).getByLabel('点位名称')).toHaveValue('展项')
  await expect(pointRows.nth(1).getByLabel('点位名称')).toHaveValue('入口')
  await expect(page.locator('.task-map-point-direction-orbit').first()).toHaveAttribute('style', /rotate\(0deg\)/)
  await expect(page.locator('.task-map-point-direction').first()).toHaveCSS('color', 'rgb(110, 99, 255)')
  if (testInfo.project.name === 'mobile') {
    const yInput = await pointRows.nth(0).getByLabel('Y', { exact: true }).boundingBox()
    expect(yInput?.width).toBeGreaterThan(100)
  }
  await page.getByRole('button', { name: '下一步' }).click()

  await expect(page.getByRole('heading', { name: '设置任务' })).toBeVisible()
  const actionMenus = page.locator('.task-action-menu')
  const pathSection = page.locator('.task-action-path').first()
  await expect(pathSection.getByRole('heading')).toHaveText('展项→入口')
  const firstActionSection = page.locator('.task-action-section').first()
  const firstTitle = firstActionSection.getByRole('heading')
  await expect(firstTitle).toHaveText('展项')
  const firstIcon = firstActionSection.locator('.task-action-section-title > svg')
  const firstAddButton = actionMenus.first().getByRole('button', { name: '添加任务' })
  await expect(firstAddButton).toHaveCSS('color', 'rgb(110, 99, 255)')
  await expect(firstActionSection.locator('.task-action-type-label')).toHaveCount(0)
  const [titleBox, iconBox, addBox] = await Promise.all([firstTitle.boundingBox(), firstIcon.boundingBox(), firstAddButton.boundingBox()])
  expect(titleBox).not.toBeNull()
  expect(iconBox).not.toBeNull()
  expect(addBox).not.toBeNull()
  expect(Math.abs((titleBox!.y + titleBox!.height / 2) - (iconBox!.y + iconBox!.height / 2))).toBeLessThan(2)
  if (testInfo.project.name === 'desktop') {
    expect(Math.abs((titleBox!.y + titleBox!.height / 2) - (addBox!.y + addBox!.height / 2))).toBeLessThan(2)
  }
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarGutter)).toBe('stable')
  await actionMenus.nth(0).getByRole('button', { name: '添加任务' }).click()
  await page.getByRole('menuitem', { name: '语音播报' }).click()
  const narration = page.getByLabel('语音播报内容')
  await expect(narration).toHaveCSS('border-color', 'rgb(217, 217, 217)')
  expect(await narration.evaluate((element) => getComputedStyle(element, '::placeholder').fontSize)).toBe('16px')
  await narration.fill('欢迎来到展厅。')
  await actionMenus.nth(0).getByRole('button', { name: '添加任务' }).click()
  await page.getByRole('menuitem', { name: '语音问答' }).click()
  await page.getByLabel('语音问答内容').fill('需要帮助吗？')
  await actionMenus.nth(0).getByRole('button', { name: '添加任务' }).click()
  await page.getByRole('menuitem', { name: '执行技能' }).click()
  const skillDialog = page.getByRole('dialog', { name: '选择技能' })
  await expect(skillDialog).toBeVisible()
  await expect(page.locator('.task-edit-action-row')).toHaveCount(2)
  await expect(skillDialog.getByText(/版本/)).toHaveCount(0)
  await expect(skillDialog.locator('section').nth(1)).toHaveCSS('border-top-style', 'solid')
  const greetingOption = skillDialog.getByRole('option', { name: /打招呼/ })
  await expect(skillDialog.getByRole('heading', { name: '官方技能' })).toHaveCSS('color', 'rgb(22, 22, 22)')
  await expect(skillDialog.getByRole('heading', { name: '官方技能' })).toHaveCSS('font-size', '16px')
  await expect(greetingOption).toHaveAttribute('aria-selected', 'false')
  await expect(greetingOption.locator('.selection-dialog-indicator')).toHaveCSS('border-color', 'rgb(217, 217, 217)')
  const [indicatorBox, labelBox] = await Promise.all([greetingOption.locator('.selection-dialog-indicator').boundingBox(), greetingOption.locator('.selection-dialog-option-copy').boundingBox()])
  expect(indicatorBox).not.toBeNull()
  expect(labelBox).not.toBeNull()
  expect(Math.abs((indicatorBox!.y + indicatorBox!.height / 2) - (labelBox!.y + labelBox!.height / 2))).toBeLessThan(1)
  await skillDialog.getByRole('button', { name: '取消' }).click()
  await expect(skillDialog).toHaveCount(0)
  await expect(page.locator('.task-edit-action-row')).toHaveCount(2)
  await actionMenus.nth(0).getByRole('button', { name: '添加任务' }).click()
  await page.getByRole('menuitem', { name: '执行技能' }).click()
  await expect(skillDialog).toBeVisible()
  await skillDialog.getByRole('option', { name: /打招呼/ }).click()
  await expect(skillDialog.getByRole('option', { name: /打招呼/ })).toHaveAttribute('aria-selected', 'true')
  const selectedIndicator = skillDialog.getByRole('option', { name: /打招呼/ }).locator('.selection-dialog-indicator')
  await expect(selectedIndicator).toHaveCSS('position', 'relative')
  const dotGeometry = await selectedIndicator.evaluate((element) => {
    const dot = getComputedStyle(element, '::after')
    return { left: Number.parseFloat(dot.left), position: dot.position, top: Number.parseFloat(dot.top), transform: dot.transform, height: element.clientHeight, width: element.clientWidth }
  })
  expect(dotGeometry).toMatchObject({ position: 'absolute', transform: 'matrix(1, 0, 0, 1, -4, -4)' })
  expect(dotGeometry.left).toBeCloseTo(dotGeometry.width / 2)
  expect(dotGeometry.top).toBeCloseTo(dotGeometry.height / 2)
  await skillDialog.getByRole('button', { name: '确定' }).click()
  await expect(page.locator('.task-skill-selection')).toHaveText('打招呼')
  await expect(page.getByText('已选：', { exact: true })).toHaveCount(0)
  const changeSkillButton = page.getByRole('button', { name: '更换技能' })
  await expect(changeSkillButton).toBeVisible()
  await expect(changeSkillButton).toHaveClass(/guide-button-icon/)
  await changeSkillButton.click()
  await expect(skillDialog).toBeVisible()
  await skillDialog.getByRole('button', { name: '取消' }).click()
  await pathSection.getByRole('button', { name: '添加任务' }).click()
  await page.getByRole('menuitem', { name: '语音播报' }).click()
  await pathSection.getByLabel('语音播报内容').fill('正在前往下一个点位。')
  const actionRows = page.locator('.task-edit-action-row')
  await expect(actionRows).toHaveCount(4)
  await expect(actionRows.locator('.guide-tag')).toHaveCount(0)
  await expect(actionRows.first().locator('.task-action-type-label')).toHaveCSS('font-size', '16px')
  if (testInfo.project.name === 'mobile') {
    const actionEditor = await actionRows.first().locator('.task-action-editor-field').boundingBox()
    expect(actionEditor?.width).toBeGreaterThan(200)
  }
  await expect(actionRows.nth(1)).not.toHaveAttribute('draggable')
  await actionRows.nth(1).getByRole('button', { name: /拖动调整.*顺序/ }).dragTo(actionRows.nth(0).getByRole('button', { name: /拖动调整.*顺序/ }))
  await expect(page.getByRole('button', { name: '保存' })).toBeEnabled()

  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/v1/tour-tasks') && response.request().method() === 'POST')
  await page.getByRole('button', { name: '保存' }).click()
  const response = await responsePromise
  expect(response.status()).toBe(201)
  taskId = (await response.json() as { id: string }).id

  try {
    await expect(page).toHaveURL(new RegExp(`/tour-tasks/${taskId}$`))
    await expect(page.getByRole('heading', { name })).toBeVisible()
    await expect(page.getByRole('heading', { name: '地图及点位' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '任务', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: '人设', exact: true })).toBeVisible()
    await expect(page.locator('.task-detail-section-heading > svg')).toHaveCount(0)
    await expect(page.locator('.task-detail-map-direction').first()).toHaveCSS('color', 'rgb(110, 99, 255)')
    await expect(page.getByText('移动时按顺序执行。')).toHaveCount(0)
    const savedPoints = page.locator('.task-point-card')
    await expect(savedPoints.nth(0).getByRole('heading')).toContainText('展项')
    await expect(savedPoints.nth(1).getByRole('heading')).toContainText('入口')
    await expect(savedPoints.nth(0).getByRole('heading')).toHaveText('展项')
    await expect(savedPoints.nth(1).getByRole('heading')).toHaveText('展项→入口')
    await expect(savedPoints.nth(2).getByRole('heading')).toHaveText('入口')
    await expect(savedPoints.filter({ hasText: /未配置(?:到达|路径)任务/ })).toHaveCount(0)
    await expect(savedPoints.nth(2)).toHaveClass(/is-empty/)
    const savedActions = page.locator('.task-action-list .task-action-row')
    await expect(savedActions).toHaveCount(4)
    await expect(savedActions.filter({ hasText: '需要帮助吗？' })).toHaveCount(1)
    await expect(savedActions.filter({ hasText: '欢迎来到展厅。' })).toHaveCount(1)
    await expect(savedActions.filter({ hasText: '打招呼' })).toHaveCount(1)
    await expect(savedActions.filter({ hasText: '正在前往下一个点位。' })).toHaveCount(1)
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
    await page.getByRole('button', { name: '保存' }).click()
    expect((await responsePromise).status()).toBe(200)
    await expect(page).toHaveURL(new RegExp(`/tour-tasks/${task.id}$`))
    await expect(page.getByText('编辑后的播报。', { exact: true })).toBeVisible()
  } finally {
    await deleteTask(request, task.id)
  }
})

async function createTaskFixture(request: APIRequestContext, name: string) {
  const mapsResponse = await request.get('/api/v1/maps')
  expect(mapsResponse.ok()).toBeTruthy()
  const maps = await mapsResponse.json() as { items: Array<{ id: string; name: string }> }
  const map = maps.items.find((item) => item.name === '王府井站站厅') ?? maps.items[0]
  expect(map).toBeTruthy()
  const response = await request.post('/api/v1/tour-tasks', {
    data: {
      name,
      mapId: map!.id,
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
