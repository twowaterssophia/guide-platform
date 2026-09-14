import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { PrismaClient } from '@prisma/client'
import type { PrismaService } from '../src/database/prisma.service'
import { LegacyMigrationService } from '../src/legacy-migration/legacy-migration.service'

function sourceData() {
  return {
    version: 2,
    data: {
      maps: [{ id: 'legacy-map', name: '可绑定地图', fileName: 'legacy.map', createdAt: '2026-08-31T09:00:00.000Z' }],
      mcpPlugins: [],
      personas: [{
        id: 'legacy-persona',
        name: '迁移人设',
        voice: 'female',
        prompt: '迁移测试人设',
        pluginIds: [],
        presetSkillsEnabled: true,
        createdAt: '2026-08-31T09:40:00.000Z',
      }],
      tourTasks: [{
        id: 'legacy-task',
        name: '迁移任务',
        mapId: 'legacy-map',
        voicePersonaId: 'legacy-persona',
        createdAt: '2026-08-31T10:00:00.000Z',
        points: [
          { id: 'legacy-point-one', name: '入口', x: 1, y: 2, angle: 0, actions: [{ id: 'legacy-action-one', type: 'speech', narration: '欢迎。' }] },
          { id: 'legacy-point-two', name: '终点', x: 3, y: 4, angle: 90, actions: [] },
        ],
        paths: [{ id: 'legacy-path-one', fromPointId: 'legacy-point-one', toPointId: 'legacy-point-two', actions: [] }],
      }],
    },
  }
}

test('legacy migration dry-run requires explicit map bindings and rejects secrets', async (context) => {
  const prisma = new PrismaClient()
  const suffix = randomUUID()
  const owner = await prisma.user.create({ data: { email: `legacy-dry-run-${suffix}@example.com` } })
  const service = new LegacyMigrationService(prisma as unknown as PrismaService, { getCurrentUser: async () => owner } as never)
  context.after(async () => {
    await prisma.user.delete({ where: { id: owner.id } })
    await prisma.$disconnect()
  })

  const missingMap = await service.dryRun(sourceData())
  assert.equal(missingMap.ready, false)
  assert.ok(missingMap.issues.some((item) => item.code === 'MAP_FILE_REQUIRED'))

  const withSecret = sourceData()
  withSecret.data.mcpPlugins = [{
    id: 'legacy-plugin', name: '需要加密', description: 'demo', examples: 'demo', serviceUrl: 'https://example.com/mcp',
    authType: 'bearer', auth: { token: 'secret-token' }, headers: '{}', tools: [], createdAt: '2026-08-31T09:00:00.000Z',
  }]
  const secretReport = await service.dryRun(withSecret, { mapBindings: { 'legacy-map': 'missing-map' } })
  assert.equal(secretReport.ready, false)
  assert.ok(secretReport.issues.some((item) => item.code === 'PLUGIN_SECRET_REQUIRES_ENCRYPTION'))
})

test('legacy migration imports a bound draft atomically and refuses a second import', async (context) => {
  const prisma = new PrismaClient()
  const suffix = randomUUID()
  const owner = await prisma.user.create({ data: { email: `legacy-import-${suffix}@example.com` } })
  const map = await prisma.mapAsset.create({
    data: {
      ownerId: owner.id,
      name: 'Bound map',
      storageKey: `tests/${suffix}/map.pcd`,
      originalFileName: 'map.pcd',
      mediaType: 'application/vnd.pointclouds',
      sizeBytes: 128,
      pcdEncoding: 'ascii',
      checksumSha256: '0'.repeat(64),
      previewStorageKey: `tests/${suffix}/map.png`,
      previewOriginalFileName: 'map.png',
      previewMediaType: 'image/png',
      previewSizeBytes: 64,
      previewChecksumSha256: '1'.repeat(64),
      registrationMetadata: {
        formatVersion: 1,
        resolution: 0.05,
        origin: { x: 0, y: 0, yaw: 0 },
        width: 1,
        height: 1,
        frameId: 'map',
        imageAxes: { x: 'right', y: 'down' },
        occupiedThreshold: 0.65,
        freeThreshold: 0.2,
        pcdTransform: { translation: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
      },
    },
  })
  const defaultPersona = await prisma.persona.findFirst({ where: { isSystemDefault: true } })
  assert.ok(defaultPersona)
  const service = new LegacyMigrationService(prisma as unknown as PrismaService, { getCurrentUser: async () => owner } as never)
  context.after(async () => {
    await prisma.user.delete({ where: { id: owner.id } })
    await prisma.$disconnect()
  })

  const raw = sourceData()
  const options = { mapBindings: { 'legacy-map': map.id } }
  const report = await service.dryRun(raw, options)
  assert.equal(report.ready, true)
  const imported = await service.importLegacy(raw, options)
  assert.deepEqual(imported.imported, { plugins: 0, personas: 1, tasks: 1, points: 2, paths: 1, actions: 1 })
  assert.equal(await prisma.tourTask.count({ where: { id: 'legacy-task', ownerId: owner.id } }), 1)
  assert.equal(await prisma.tourTask.findUnique({ where: { id: 'legacy-task' } }).then((task) => task?.status), 'DRAFT')
  assert.equal(await prisma.tourTask.findUnique({ where: { id: 'legacy-task' } }).then((task) => task?.mapId), map.id)

  await assert.rejects(service.importLegacy(raw, options))
  assert.equal(await prisma.persona.count({ where: { id: 'legacy-persona' } }), 1)
  assert.equal(await prisma.tourTask.count({ where: { id: 'legacy-task' } }), 1)
})
