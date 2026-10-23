import { expect, test } from '@playwright/test'

const taskSummary = {
  id: 'navigation-task',
  name: '跨页面导览任务',
  mapName: '企业展厅一层',
  pointCount: 4,
  version: 1,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
}

for (const initialPath of ['/robots', '/robots/demo-robot-01', '/tour-tasks']) {
  test(`task and robot pages keep compatible data when starting at ${initialPath}`, async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    let holdResponses = false
    let releaseResponses: () => void = () => {}
    const pendingResponses = new Promise<void>((resolve) => { releaseResponses = resolve })
    await page.route('**/api/v1/tour-tasks', async (route) => {
      if (holdResponses) await pendingResponses
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify([taskSummary]) })
    })

    const navigation = page.getByRole('navigation', { name: '主要导航' })
    const taskRow = page.getByRole('row', { name: `查看任务 ${taskSummary.name}` })
    const firstRobot = page.getByRole('row').filter({ hasText: 'T2 V1.2 - 999' })
    const dispatchDialog = page.getByRole('dialog', { name: '下发导览任务' })

    try {
      await page.goto(initialPath)
      if (initialPath === '/tour-tasks') {
        await expect(taskRow).toBeVisible()
        // Keep the next response pending so it cannot hide incompatible cached data.
        holdResponses = true
        await navigation.getByRole('link', { name: '机器人', exact: true }).click()
        await firstRobot.getByRole('button', { name: '下发任务', exact: true }).click()
        await expect(dispatchDialog.getByText('正在读取导览任务…')).toBeVisible()
      } else if (initialPath === '/robots') {
        await firstRobot.getByRole('button', { name: '下发任务', exact: true }).click()
      } else {
        await page.getByRole('button', { name: '启动导览 Agent', exact: true }).click()
        await page.getByRole('button', { name: '下发任务', exact: true }).click()
      }

      releaseResponses()
      await expect(dispatchDialog.getByText(taskSummary.name, { exact: true })).toBeVisible()
      await dispatchDialog.getByRole('button', { name: '取消', exact: true }).click()
      if (initialPath === '/robots/demo-robot-01') {
        await page.getByRole('button', { name: '返回机器人列表' }).click()
      }

      await navigation.getByRole('link', { name: '导览任务', exact: true }).click()
      await expect(taskRow).toBeVisible()
      await navigation.getByRole('link', { name: '机器人', exact: true }).click()
      await firstRobot.getByRole('button', { name: '实时监控', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'T2 V1.2 - 999', exact: true })).toBeVisible()
      await page.getByRole('button', { name: '返回机器人列表' }).click()
      await firstRobot.getByRole('button', { name: '下发任务', exact: true }).click()
      await expect(dispatchDialog.getByText(taskSummary.name, { exact: true })).toBeVisible()
      await dispatchDialog.getByRole('button', { name: '取消', exact: true }).click()
      await navigation.getByRole('link', { name: '导览任务', exact: true }).click()
      await expect(taskRow).toBeVisible()
      expect(pageErrors).toEqual([])
    } finally {
      releaseResponses()
    }
  })
}
