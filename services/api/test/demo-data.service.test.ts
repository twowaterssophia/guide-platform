import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import test from 'node:test'
import { PrismaClient } from '@prisma/client'
import type { PrismaService } from '../src/database/prisma.service'
import { DemoDataService } from '../src/demo-data/demo-data.service'
import { demoMapDimensions, demoPcd, demoPreview, demoRegistration } from '../src/demo-data/demo-map'
import { validateMapBundle } from '../src/maps/map-file-validation'

test('demo map provides a square floor plan and matching point cloud', () => {
  const validated = validateMapBundle(
    { fileName: 'wangfujing-station-hall.pcd', value: demoPcd },
    { fileName: 'wangfujing-station-hall.png', value: demoPreview },
    { fileName: 'wangfujing-station-hall.json', value: Buffer.from(JSON.stringify(demoRegistration)) },
  )
  const pointCount = Number(demoPcd.toString('utf8').match(/^POINTS (\d+)$/m)?.[1])

  assert.deepEqual(demoMapDimensions, { width: 960, height: 960 })
  assert.equal(validated.previewWidth, demoMapDimensions.width)
  assert.equal(validated.previewHeight, demoMapDimensions.height)
  assert.equal(validated.registration.width, demoMapDimensions.width)
  assert.equal(validated.registration.height, demoMapDimensions.height)
  assert.ok(pointCount > 200)
})

test('resets only the current user data and restores the current demo task baseline', async (context) => {
  const prisma = new PrismaClient()
  const suffix = randomUUID()
  const owner = await prisma.user.create({ data: { email: `demo-reset-${suffix}@example.com` } })
  const map = await prisma.mapAsset.create({
    data: { ownerId: owner.id, name: '待删除地图', storageKey: `${suffix}/map.pcd`, originalFileName: 'old.pcd', mediaType: 'application/octet-stream', sizeBytes: 1 },
  })
  await prisma.tourTask.create({ data: { ownerId: owner.id, name: '待删除任务', mapId: map.id, points: { create: { sequence: 1, name: '点位', x: 0, y: 0, angle: 0 } } } })
  await prisma.mcpPlugin.create({ data: { ownerId: owner.id, name: '待删除插件', description: '描述', examples: '示例', serviceUrl: 'https://example.com/mcp' } })
  await prisma.persona.create({ data: { ownerId: owner.id, name: '待删除人设', voice: 'female' } })

  const deletedStorageIds: string[] = []
  const service = new DemoDataService(
    prisma as unknown as PrismaService,
    { getCurrentUser: async () => owner } as never,
    { save: async (id: string) => ({ pcdStorageKey: `${id}/map.pcd`, previewStorageKey: `${id}/map.png` }), delete: async (id: string) => { deletedStorageIds.push(id) } } as never,
  )
  context.after(async () => {
    await prisma.user.delete({ where: { id: owner.id } }).catch(() => undefined)
    await prisma.$disconnect()
  })

  await service.resetCurrentUser()

  assert.equal(await prisma.mcpPlugin.count({ where: { ownerId: owner.id } }), 1)
  assert.equal(await prisma.persona.count({ where: { ownerId: owner.id } }), 1)
  assert.equal(await prisma.mapAsset.count({ where: { ownerId: owner.id } }), 1)
  const task = await prisma.tourTask.findFirstOrThrow({ where: { ownerId: owner.id }, include: { persona: true, points: { include: { actions: true } }, paths: { include: { actions: true } } } })
  assert.equal(task.name, '王府井站站厅巡检')
  assert.equal(task.points.length, 3)
  assert.equal(task.persona?.name, '王府井地铁站站务员')
  assert.equal(task.points[0]?.actions[0]?.skillName, '转动头部')
  assert.equal(task.paths.length, 2)
  assert.equal(task.paths[0]?.actions[0]?.narration, '正在前往站厅 PIS 屏。')
  assert.ok(deletedStorageIds.includes(map.id))
})
