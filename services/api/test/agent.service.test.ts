import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { ConflictException } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import type { PrismaService } from '../src/database/prisma.service'
import { AgentService } from '../src/agent/agent.service'

const registrationMetadata = {
  formatVersion: 1 as const,
  resolution: 0.05,
  origin: { x: 0, y: 0, yaw: 0 },
  width: 1,
  height: 1,
  frameId: 'map',
  imageAxes: { x: 'right' as const, y: 'down' as const },
  occupiedThreshold: 0.65,
  freeThreshold: 0.2,
  pcdTransform: {
    translation: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
  },
}

test('agent sync lists published tasks, downloads a package, tracks versions, and removes it', async (context) => {
  const prisma = new PrismaClient()
  const suffix = randomUUID()
  const owner = await prisma.user.create({ data: { email: `agent-owner-${suffix}@example.com`, displayName: 'Agent owner' } })
  const map = await prisma.mapAsset.create({
    data: {
      ownerId: owner.id,
      name: 'Agent map',
      storageKey: `tests/${suffix}/map.pcd`,
      originalFileName: 'map.pcd',
      mediaType: 'application/vnd.pointclouds',
      sizeBytes: 4,
      pcdEncoding: 'ascii',
      checksumSha256: '0'.repeat(64),
      previewStorageKey: `tests/${suffix}/map.png`,
      previewOriginalFileName: 'map.png',
      previewMediaType: 'image/png',
      previewSizeBytes: 3,
      previewChecksumSha256: '1'.repeat(64),
      registrationMetadata,
    },
  })
  const task = await prisma.tourTask.create({
    data: {
      id: `agent-task-${suffix}`,
      ownerId: owner.id,
      name: 'Agent tour',
      mapId: map.id,
      status: 'PUBLISHED',
      version: 2,
      points: {
        create: [
          { id: `agent-point-1-${suffix}`, sequence: 1, name: '入口', x: 1, y: 2, angle: 0, actions: { create: [{ id: `agent-action-${suffix}`, sequence: 1, type: 'SPEECH', narration: '欢迎。' }] } },
        ],
      },
    },
  })
  const deviceId = `device-${suffix}`
  const currentUser = { getCurrentUser: async () => ({ id: owner.id, email: owner.email, displayName: owner.displayName }) }
  const storage = {
    read: async (key: string) => key.endsWith('.pcd') ? Buffer.from('PCD') : Buffer.from([137, 80, 78]),
  }
  const service = new AgentService(prisma as unknown as PrismaService, currentUser as never, storage as never)

  context.after(async () => {
    await prisma.user.delete({ where: { id: owner.id } })
    await prisma.$disconnect()
  })

  const available = await service.list(deviceId)
  assert.equal(available.items.length, 1)
  assert.equal(available.items[0]?.syncState, 'AVAILABLE')
  assert.equal(available.items[0]?.publishedVersion, 2)

  const downloaded = await service.download(task.id, deviceId)
  assert.equal(downloaded.task.status, 'PUBLISHED')
  assert.equal(downloaded.downloadedVersion, 2)
  assert.equal(Buffer.from(downloaded.map.pcd.contentBase64, 'base64').toString(), 'PCD')
  assert.equal(await prisma.agentDownload.count({ where: { deviceId, tourTaskId: task.id } }), 1)

  const downloadedList = await service.list(deviceId)
  assert.equal(downloadedList.items[0]?.syncState, 'DOWNLOADED')

  await prisma.tourTask.update({ where: { id: task.id }, data: { version: 3 } })
  const updateList = await service.list(deviceId)
  assert.equal(updateList.items[0]?.syncState, 'UPDATE_AVAILABLE')

  await service.remove(task.id, deviceId)
  assert.equal(await prisma.agentDownload.count({ where: { deviceId, tourTaskId: task.id } }), 0)
})

test('agent download rejects a published task whose map bundle is incomplete', async (context) => {
  const prisma = new PrismaClient()
  const suffix = randomUUID()
  const owner = await prisma.user.create({ data: { email: `agent-incomplete-${suffix}@example.com` } })
  const map = await prisma.mapAsset.create({
    data: {
      ownerId: owner.id,
      name: 'Incomplete map',
      storageKey: `tests/${suffix}/map.pcd`,
      originalFileName: 'map.pcd',
      mediaType: 'application/vnd.pointclouds',
      sizeBytes: 4,
    },
  })
  const task = await prisma.tourTask.create({ data: { ownerId: owner.id, name: 'Blocked agent tour', mapId: map.id, status: 'PUBLISHED' } })
  const currentUser = { getCurrentUser: async () => ({ id: owner.id, email: owner.email, displayName: owner.displayName }) }
  const service = new AgentService(prisma as unknown as PrismaService, currentUser as never, { read: async () => Buffer.from('x') } as never)
  context.after(async () => {
    await prisma.user.delete({ where: { id: owner.id } })
    await prisma.$disconnect()
  })
  await assert.rejects(service.download(task.id, 'device-incomplete'), ConflictException)
})
