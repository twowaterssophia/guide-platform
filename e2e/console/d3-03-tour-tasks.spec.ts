import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

const longNarration = '请跟随机器人前往下一处展项，途中注意脚下，并在到达后依次了解展品的背景、设计思路和实际应用。'

async function createTestTask(request: APIRequestContext, name: string) {
  const response = await request.post('/api/v1/tour-tasks', {
    data: {
      name,
      mapId: 'demo-wangfujing-map',
      personaId: '__system_default__',
      points: [
        {
          key: 'service-desk',
          name: '站厅服务台',
          x: 210,
          y: 322,
          angle: 90,
          actions: [
            { type: 'SPEECH', narration: longNarration },
            { type: 'SKILL', skillId: 'official-handshake' },
          ],
        },
        {
          key: 'pis-screen',
          name: '站厅 PIS 屏',
          x: 492,
          y: 220,
          angle: 0,
          actions: [{ type: 'INTERACTION', interactionPrompt: '您还想了解哪些信息？' }],
        },
      ],
      paths: [{
        fromPointKey: 'service-desk',
        toPointKey: 'pis-screen',
        actions: [{ type: 'SPEECH', narration: '正在前往站厅 PIS 屏。' }],
      }],
    },
  })
  expect(response.status()).toBe(201)
  return response.json() as Promise<{ id: string }>
}

test('opens a task in an independent detail page and renders ordered actions', async ({ page, request }, testInfo) => {
  const name = `D3-03 task detail ${testInfo.project.name} ${Date.now()}`
  const task = await createTestTask(request, name)
  try {
    await page.goto('/tour-tasks')
    await page.getByRole('row', { name: `查看任务 ${name}` }).click()

    await expect(page).toHaveURL(new RegExp(`/tour-tasks/${task.id}$`))
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible()
    await expect(page.getByText('王府井站站厅', { exact: true })).toBeVisible()
    await expect(page.getByText('默认', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: '站厅服务台' })).toBeVisible()
    await expect(page.getByText(longNarration)).toBeVisible()
    await expect(page.getByText('握手', { exact: true })).toBeVisible()
    await expect(page.getByText('正在前往站厅 PIS 屏。')).toBeVisible()
    await expect(page.getByText('您还想了解哪些信息？')).toBeVisible()
  } finally {
    await request.delete(`/api/v1/tour-tasks/${task.id}`)
  }
})

test('deletes a task from the list without opening its detail page', async ({ page, request }, testInfo) => {
  const name = `D3-03 task delete ${testInfo.project.name} ${Date.now()}`
  const task = await createTestTask(request, name)
  let deleted = false
  try {
    await page.goto('/tour-tasks')
    await page.getByRole('button', { name: `更多操作：${name}` }).click()
    await page.getByRole('menuitem', { name: '删除' }).click()

    const dialog = page.getByRole('dialog', { name: `确认删除“${name}”？` })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    const responsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/v1/tour-tasks/${task.id}`) && response.request().method() === 'DELETE')
    await dialog.getByRole('button', { name: '确认' }).click()
    expect((await responsePromise).status()).toBe(204)
    deleted = true

    await expect(page.getByText('任务已删除')).toBeVisible()
    await expect(page.getByRole('row', { name: `查看任务 ${name}` })).toBeHidden()
    await expect(page).toHaveURL(/\/tour-tasks$/)
  } finally {
    if (!deleted) await request.delete(`/api/v1/tour-tasks/${task.id}`)
  }
})
