import { expect, test } from '@playwright/test'

const taskSummary = {
  id: 'demo-tour-lobby',
  name: '展厅全景导览',
  mapName: '企业展厅一层',
  pointCount: 4,
  version: 3,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

test('robot monitor completes dispatch, localization and tour controls', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  if (testInfo.project.name === 'desktop') await page.setViewportSize({ width: 1242, height: 764 })
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem('robot-console-test-initialized')) return
    window.localStorage.removeItem('guide.robot-console-demo.v2')
    window.sessionStorage.setItem('robot-console-test-initialized', '1')
  })
  await page.route('**/api/v1/tour-tasks', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify([taskSummary]) })
    } else {
      await route.continue()
    }
  })

  await page.goto('/robots')
  const robotList = page.getByRole('table', { name: '机器人列表' })
  await expect(robotList.locator('.rc-robot-row')).toHaveCount(2)
  await expect(robotList.getByText('导览机器人 03', { exact: true })).toHaveCount(0)
  await expect(robotList.getByText('连接状态', { exact: true })).toHaveCount(0)
  await expect(page.locator('.rc-robot-list-page')).not.toContainText(/模拟|虚拟|mock|演示|demo/i)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: `test-results/robot-list-${testInfo.project.name}.png`, fullPage: true })
  const firstRobot = robotList.getByRole('row').filter({ hasText: 'T2 V1.2 - 999' })
  await firstRobot.getByRole('button', { name: '下发任务', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '下发导览任务' })).toBeVisible()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await firstRobot.getByRole('button', { name: '实时监控', exact: true }).click()
  if (testInfo.project.name === 'desktop') await page.setViewportSize({ width: 921, height: 764 })
  await expect(page.getByRole('heading', { name: 'T2 V1.2 - 999' })).toBeVisible()
  const controlPanel = page.getByRole('region', { name: '地图和导览任务操控' })
  await expect(controlPanel.getByText('启动导览 Agent 后，即可进行导览相关操控')).toBeVisible()
  await expect(controlPanel.getByRole('button')).toHaveCount(1)
  await expect(controlPanel.locator('svg')).toHaveCount(0)
  await expect(page.getByText('导览 Agent 未启动')).toHaveCount(0)
  await expect(page.getByText('远程监控 · Demo')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^(前进|后退|左移|右移)$/ })).toHaveCount(0)
  await expect(page.getByRole('slider', { name: '机器人语音音量' })).toHaveCSS('accent-color', 'rgb(110, 99, 255)')
  const volume = page.getByRole('slider', { name: '机器人语音音量' })
  await expect(volume).toHaveValue('60')
  const muteButton = page.getByRole('button', { name: '静音', exact: true })
  await expect(muteButton).toHaveAttribute('aria-pressed', 'false')
  const unmutedColor = await muteButton.evaluate((button) => getComputedStyle(button).backgroundColor)
  await muteButton.click()
  await page.getByRole('heading', { name: '实时画面', exact: true }).hover()
  await expect(muteButton).toHaveAttribute('aria-pressed', 'true')
  expect(await muteButton.evaluate((button) => getComputedStyle(button).backgroundColor)).not.toBe(unmutedColor)
  await page.reload()
  await expect(muteButton).toHaveAttribute('aria-pressed', 'true')
  await muteButton.click()
  await expect(muteButton).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('button', { name: '女声' })).toHaveCSS('color', 'rgb(110, 99, 255)')
  await expect(page.locator('.rc-monitor-header')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(page.locator('.rc-voice-note')).toHaveCount(0)
  await page.screenshot({ path: `test-results/robot-console-inactive-${testInfo.project.name}.png`, fullPage: true })

  await page.getByRole('button', { name: '已连接', exact: true }).click()
  await expect(page.getByRole('button', { name: '启动导览 Agent' })).toBeDisabled()
  await expect(muteButton).toBeDisabled()
  await page.getByRole('button', { name: '重新连接' }).click()

  await page.getByRole('button', { name: '启动导览 Agent' }).click()
  await expect(controlPanel.getByText('当前机器人上没有导览任务')).toBeVisible()
  await expect(controlPanel.getByRole('button')).toHaveCount(1)
  await expect(controlPanel.getByText('选择机器人上的导览任务')).toHaveCount(0)
  await page.screenshot({ path: `test-results/robot-console-empty-${testInfo.project.name}.png`, fullPage: true })
  await controlPanel.getByRole('button', { name: '下发任务', exact: true }).click()
  const dispatchDialog = page.getByRole('dialog', { name: '下发导览任务' })
  await expect(dispatchDialog.getByText('展厅全景导览')).toBeVisible()
  await dispatchDialog.getByRole('button', { name: '确定', exact: true }).click()
  await expect(page.getByText('已向机器人下发 1 个任务。')).toBeVisible()

  await expect(controlPanel.getByRole('heading', { name: '导览任务列表' })).toBeVisible()
  await expect(page.locator('.rc-map-section')).toHaveCount(0)
  await page.locator('.rc-downloaded-select').filter({ hasText: '展厅全景导览' }).click()
  await expect(page.getByRole('heading', { name: '企业展厅一层' })).toBeVisible()
  await expect(page.locator('.rc-task-list-section')).toHaveCount(0)
  await expect(page.getByText('接待入口 · 起点')).toBeVisible()
  await expect(page.getByRole('button', { name: '开始导览' })).toBeDisabled()

  const cameraFrame = await page.locator('.rc-camera-frame').boundingBox()
  const mapFrame = await page.locator('.rc-map-shell').boundingBox()
  expect(Math.abs(cameraFrame!.width - mapFrame!.width)).toBeLessThan(1)
  expect(Math.abs(cameraFrame!.height - mapFrame!.height)).toBeLessThan(1)
  if (testInfo.project.name === 'desktop') expect(Math.abs(cameraFrame!.y - mapFrame!.y)).toBeLessThan(1)
  await expect(page.locator('.rc-location-controls .rc-localization-tag')).toHaveText('未定位')
  await page.getByRole('button', { name: '一键定位', exact: true }).click()
  await expect(page.getByText('机器人定位中，请让机器人站在路线起点附近')).toBeVisible()
  await expect(page.locator('.rc-localization-tag')).toHaveText(/定位中/)
  await expect(page.locator('.rc-localization-tag')).toHaveText(/定位正常/, { timeout: 5_000 })

  await page.getByRole('button', { name: '开始导览' }).click()
  await expect(page.locator('.rc-execution-tag')).toHaveText('执行中')
  await expect(page.getByRole('button', { name: /^(前进|后退|左移|右移)$/ })).toHaveCount(0)
  await page.getByRole('button', { name: '男声' }).click()
  await page.getByRole('button', { name: '开始人工接管' }).click()
  await expect(page.getByText('人工接管中 · 自动播报暂停，路线继续执行')).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/模拟|虚拟|mock|演示|demo/i)
  await expect(page.getByText('正在从 接待入口 → 发展历程')).toBeVisible({ timeout: 7_000 })

  await page.getByRole('button', { name: '暂停导览' }).click()
  await expect(page.locator('.rc-execution-tag')).toHaveText('已暂停')
  await page.getByRole('button', { name: '返回任务列表', exact: true }).click()
  await expect(page.locator('.rc-map-section')).toHaveCount(0)
  await page.locator('.rc-downloaded-select').filter({ hasText: '展厅全景导览' }).click()
  await expect(page.locator('.rc-execution-tag')).toHaveText('已暂停')
  await expect(page.locator('.rc-localization-tag')).toHaveText('定位正常')
  await page.getByRole('button', { name: /下一步/ }).click()
  await expect(page.locator('.rc-flow-item.is-current .rc-flow-copy small')).toContainText('语音播报「请跟随我前往发展历程…」')
  await page.getByRole('button', { name: '继续导览' }).click()
  await expect(page.locator('.rc-execution-tag')).toHaveText('执行中')
  await page.getByRole('button', { name: '结束导览' }).click()
  await expect(page.locator('.rc-execution-tag')).toHaveText('已结束')

  if (testInfo.project.name === 'desktop') {
    await expect(page.locator('.rc-monitor-layout')).toHaveCSS('grid-template-columns', /[\d.]+px\s+[\d.]+px/)
  } else {
    await expect(page.locator('.rc-monitor-layout')).toHaveCSS('flex-direction', 'column')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  }

  await page.screenshot({ path: `test-results/robot-console-${testInfo.project.name}.png`, fullPage: true })
  await page.reload()
  await expect(page.getByRole('heading', { name: '企业展厅一层' })).toBeVisible()
  await expect(page.locator('.rc-execution-tag')).toHaveText('已结束')
  await expect(page.getByText('接待入口 · 起点')).toBeVisible()

  // Stored telemetry from older demos or a completed tour must not require remote movement.
  await page.evaluate(() => {
    const key = 'guide.robot-console-demo.v2'
    const state = JSON.parse(window.localStorage.getItem(key)!)
    state.robots['demo-robot-01'].runtime.position = { x: 900, y: 400 }
    state.robots['demo-robot-01'].runtime.localization = 'UNLOCALIZED'
    state.robots['demo-robot-01'].runtime.volume = 72
    delete state.robots['demo-robot-01'].volumeDefaultVersion
    window.localStorage.setItem(key, JSON.stringify(state))
  })
  await page.reload()
  await expect(volume).toHaveValue('60')
  await page.getByRole('button', { name: '一键定位', exact: true }).click()
  await expect(page.locator('.rc-localization-tag')).toHaveText('定位正常', { timeout: 5_000 })
  await expect(page.getByRole('button', { name: '再次开始' })).toBeEnabled()
  expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem('guide.robot-console-demo.v2')!).robots['demo-robot-01'].runtime.position)).toEqual({ x: 120, y: 390, angle: 0 })

  // A later explicit choice of 72% must not be mistaken for the old default.
  await page.getByRole('button', { name: '提高音量' }).click()
  await expect(volume).toHaveValue('65')
  await page.getByRole('button', { name: '提高音量' }).click()
  await expect(volume).toHaveValue('70')
  await volume.press('ArrowRight')
  await expect(volume).toHaveValue('71')
  await volume.press('ArrowRight')
  await expect(volume).toHaveValue('72')
  await page.reload()
  await expect(volume).toHaveValue('72')

  await page.getByRole('button', { name: '返回任务列表', exact: true }).click()
  await page.getByRole('button', { name: '删除 展厅全景导览', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: '确认删除' }).click()
  await expect(controlPanel.getByText('当前机器人上没有导览任务')).toBeVisible()
  await expect(controlPanel.getByRole('button', { name: '下发任务', exact: true })).toBeEnabled()
  await expect(controlPanel.getByRole('button')).toHaveCount(1)

  // Disconnected robots disappear when returning to the list, including the last one.
  await page.getByRole('button', { name: '已连接', exact: true }).click()
  await page.getByRole('button', { name: '返回机器人列表' }).click()
  await expect(robotList.locator('.rc-robot-row')).toHaveCount(1)
  await expect(robotList.getByText('T2 V1.2 - 999', { exact: true })).toHaveCount(0)
  await robotList.getByRole('button', { name: '实时监控', exact: true }).click()
  await page.getByRole('button', { name: '已连接', exact: true }).click()
  await page.getByRole('button', { name: '返回机器人列表' }).click()
  await expect(page.getByText('暂无已连接的机器人', { exact: true })).toBeVisible()
  await expect(robotList).toHaveCount(0)
})

test('localization supports timeout, point selection and marker headings', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('localization-test-ready')) return
    sessionStorage.setItem('localization-test-ready', '1')
    const timestamp = '2026-10-01T00:00:00.000Z'
    const task = {
      id: 'heading-task', name: '朝向与定位导览', map: { id: 'heading-map', name: '定位测试地图' }, persona: null, version: 1,
      points: [
        { id: 'start', sequence: 1, name: '入口', x: 120, y: 390, angle: 90, actions: [] },
        { id: 'end', sequence: 2, name: '出口', x: 800, y: 150, angle: 180, actions: [] },
      ], paths: [], createdAt: timestamp, updatedAt: timestamp,
    }
    localStorage.setItem('guide.robot-console-demo.v2', JSON.stringify({ robots: { 'demo-robot-01': {
      volumeDefaultVersion: 1, connection: 'CONNECTED', agentActive: true,
      dispatchedTasks: [{ taskId: task.id, name: task.name, mapId: task.map.id, mapName: task.map.name, taskVersion: 1, dispatchState: 'DISPATCHED', downloadedAt: timestamp }],
      selectedTaskId: task.id, selectedSnapshot: { task, map: null },
      runtime: { selectedTaskId: task.id, position: { x: 120, y: 390, angle: 270 }, localization: 'UNLOCALIZED', execution: 'IDLE', currentFlowIndex: 0, voiceTakeover: false, voice: 'FEMALE', volume: 60, muted: false },
    } } }))
  })
  await page.route('**/api/v1/tour-tasks', (route) => route.fulfill({ contentType: 'application/json', body: '[]' }))
  await page.goto('/robots/demo-robot-01?task=heading-task')
  await expect(page.getByRole('heading', { name: '定位测试地图' })).toBeVisible()
  await expect(page.locator('.rc-point-heading').nth(0)).toHaveAttribute('transform', 'rotate(90)')
  await expect(page.locator('.rc-point-heading').nth(1)).toHaveAttribute('transform', 'rotate(180)')
  await expect(page.locator('.rc-robot-heading')).toHaveAttribute('transform', 'rotate(270)')

  // When no successful result arrives within a minute, show the failure actions.
  await page.clock.install()
  await page.getByRole('button', { name: '一键定位', exact: true }).click()
  await expect(page.getByText('机器人定位中，请让机器人站在路线起点附近')).toBeVisible()
  await page.clock.fastForward(60_001)
  await expect(page.locator('.rc-localization-tag')).toHaveText('定位失败')
  await expect(page.getByRole('button', { name: '重新定位', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: '选点定位', exact: true })).toBeEnabled()
  await expect(page.getByText('定位成功', { exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: '选点定位', exact: true }).click()
  await expect(page.getByText('请在地图上标识机器人所在位置')).toBeVisible()
  await expect(page.getByRole('button', { name: '确定', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await expect(page.locator('.rc-map-pick-controls')).toHaveCount(0)
  await expect(page.locator('.rc-localization-tag')).toHaveText('定位失败')

  await page.getByRole('button', { name: '放大地图', exact: true }).click()
  await page.getByRole('button', { name: '旋转地图', exact: true }).click()
  const canvas = page.getByRole('application', { name: '导览地图，可拖动和缩放' })
  await canvas.scrollIntoViewIfNeeded()
  const rect = await canvas.boundingBox()
  await page.mouse.move(rect!.x + rect!.width / 2, rect!.y + rect!.height / 2)
  await page.mouse.down()
  await page.mouse.move(rect!.x + rect!.width / 2 + 20, rect!.y + rect!.height / 2 + 10)
  await page.mouse.up()
  await page.getByRole('button', { name: '选点定位', exact: true }).click()
  await canvas.scrollIntoViewIfNeeded()
  // A known map coordinate must remain selectable after pan, zoom and rotation.
  const clickPoint = await page.locator('.rc-map-layer').evaluate((layer) => {
    const viewport = layer.parentElement!.getBoundingClientRect()
    const scale = Math.min(viewport.width / 960, viewport.height / 500)
    const matrix = new DOMMatrix(getComputedStyle(layer).transform)
    const offset = matrix.transformPoint(new DOMPoint((600 - 480) * scale, (220 - 250) * scale))
    return { x: viewport.width / 2 + offset.x, y: viewport.height / 2 + offset.y }
  })
  await canvas.click({ position: clickPoint })
  await expect(page.locator('.rc-picked-position')).toBeVisible()
  await expect(page.getByRole('button', { name: '确定', exact: true })).toBeEnabled()
  await page.screenshot({ path: `test-results/robot-point-selection-${testInfo.project.name}.png`, fullPage: true })
  await page.getByRole('button', { name: '确定', exact: true }).click()
  await expect(page.getByText('定位中，请保持机器人在所选点位附近')).toBeVisible()
  await page.reload()
  await expect(page.getByText('定位中，请保持机器人在所选点位附近')).toBeVisible()
  await page.clock.runFor(2300)
  await expect(page.locator('.rc-localization-tag')).toHaveText('定位正常')
  const position = await page.evaluate(() => JSON.parse(localStorage.getItem('guide.robot-console-demo.v2')!).robots['demo-robot-01'].runtime.position)
  expect(position.x).toBeCloseTo(600, 0)
  expect(position.y).toBeCloseTo(220, 0)
  expect(position.angle).toBe(270)
  await expect(page.locator('.rc-robot-heading')).toHaveAttribute('transform', 'rotate(270)')
  await expect(page.getByRole('button', { name: '开始导览', exact: true })).toBeEnabled()
})
