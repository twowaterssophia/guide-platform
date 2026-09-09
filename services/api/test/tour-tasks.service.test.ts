import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import type { TourTaskWriteInput } from '@guide/contracts'
import type { PrismaService } from '../src/database/prisma.service'
import { DemoSkillCatalogProvider } from '../src/skills/demo-skill-catalog.provider'
import { TourTasksService } from '../src/tour-tasks/tour-tasks.service'

test('tour task CRUD preserves ownership, ordering, versions, and cascades', async (context) => {
  const prisma = new PrismaClient()
  const suffix = randomUUID()
  const owner = await prisma.user.create({
    data: { email: `task-owner-${suffix}@example.com`, displayName: 'Task test owner' },
  })
  const otherOwner = await prisma.user.create({
    data: { email: `other-task-owner-${suffix}@example.com`, displayName: 'Other task test owner' },
  })
  const map = await prisma.mapAsset.create({
    data: {
      ownerId: owner.id,
      name: 'Owned map',
      storageKey: `tests/${suffix}/owned.pcd`,
      originalFileName: 'owned.pcd',
      mediaType: 'application/vnd.pointclouds',
      sizeBytes: 128,
    },
  })
  const publishableMap = await prisma.mapAsset.create({
    data: {
      ownerId: owner.id,
      name: 'Publishable map',
      storageKey: `tests/${suffix}/publishable/map.pcd`,
      originalFileName: 'publishable.pcd',
      mediaType: 'application/vnd.pointclouds',
      sizeBytes: 128,
      pcdEncoding: 'ascii',
      checksumSha256: '0'.repeat(64),
      previewStorageKey: `tests/${suffix}/publishable/map.png`,
      previewOriginalFileName: 'publishable.png',
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
        pcdTransform: {
          translation: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
        },
      },
    },
  })
  const otherMap = await prisma.mapAsset.create({
    data: {
      ownerId: otherOwner.id,
      name: 'Other map',
      storageKey: `tests/${suffix}/other.pcd`,
      originalFileName: 'other.pcd',
      mediaType: 'application/vnd.pointclouds',
      sizeBytes: 128,
    },
  })
  const persona = await prisma.persona.create({
    data: { ownerId: owner.id, name: 'Owned persona', voice: 'female' },
  })
  const otherPersona = await prisma.persona.create({
    data: { ownerId: otherOwner.id, name: 'Other persona', voice: 'male' },
  })
  const currentUser = {
    getCurrentUser: async () => ({ id: owner.id, email: owner.email, displayName: owner.displayName }),
  }
  const service = new TourTasksService(
    prisma as unknown as PrismaService,
    currentUser as never,
    new DemoSkillCatalogProvider(),
  )

  context.after(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, otherOwner.id] } } })
    await prisma.$disconnect()
  })

  const writeInput: TourTaskWriteInput = {
    name: 'Integration tour',
    mapId: map.id,
    personaId: persona.id,
    points: [
      {
        key: 'entrance',
        name: 'Entrance',
        x: 12.5,
        y: -8,
        angle: 90,
        actions: [
          { type: 'SPEECH', narration: 'Welcome' },
          { type: 'SKILL', skillId: 'official-handshake' },
        ],
      },
      {
        key: 'exhibit',
        name: 'Exhibit',
        x: 40,
        y: 18,
        angle: 180,
        actions: [{ type: 'INTERACTION', interactionPrompt: 'Any questions?' }],
      },
    ],
    paths: [{
      fromPointKey: 'entrance',
      toPointKey: 'exhibit',
      actions: [
        { type: 'SPEECH', narration: 'Follow me' },
        { type: 'INTERACTION', interactionPrompt: 'Ready to continue?' },
      ],
    }],
  }

  await context.test('creates and reads a fully ordered task detail', async () => {
    const created = await service.create(writeInput)

    assert.equal(created.status, 'DRAFT')
    assert.equal(created.version, 1)
    assert.equal(created.map.id, map.id)
    assert.equal(created.persona?.id, persona.id)
    assert.deepEqual(created.points.map((point) => point.sequence), [1, 2])
    assert.deepEqual(created.points[0]?.actions.map((action) => action.sequence), [1, 2])
    assert.deepEqual(created.points[0]?.actions.map((action) => action.type), ['SPEECH', 'SKILL'])
    assert.equal(created.points[0]?.actions[1]?.type === 'SKILL' ? created.points[0].actions[1].skillName : '', '握手')
    assert.deepEqual(created.paths.map((path) => path.sequence), [1])
    assert.deepEqual(created.paths[0]?.actions.map((action) => action.type), ['SPEECH', 'INTERACTION'])

    const loaded = await service.get(created.id)
    assert.deepEqual(loaded, created)
  })

  await context.test('rejects maps, personas, and skills outside the usable catalog', async () => {
    await assert.rejects(service.create({ ...writeInput, mapId: otherMap.id }), NotFoundException)
    await assert.rejects(service.create({ ...writeInput, personaId: otherPersona.id }), NotFoundException)
    await assert.rejects(service.create({
      ...writeInput,
      points: [{ ...writeInput.points[0], actions: [{ type: 'SKILL', skillId: 'missing-skill' }] }],
      paths: [],
    }), BadRequestException)
  })

  await context.test('detects a stale version after one successful update', async () => {
    const created = await service.create({ ...writeInput, name: 'Versioned tour' })
    const updated = await service.update(created.id, {
      ...writeInput,
      name: 'Versioned tour updated',
      expectedVersion: created.version,
    })

    assert.equal(updated.version, 2)
    assert.equal(updated.name, 'Versioned tour updated')
    await assert.rejects(
      service.update(created.id, { ...writeInput, name: 'Stale update', expectedVersion: created.version }),
      ConflictException,
    )
    const unchanged = await service.get(created.id)
    assert.equal(unchanged.version, 2)
    assert.equal(unchanged.name, 'Versioned tour updated')
  })

  await context.test('deletes points, paths, and actions with the task', async () => {
    const created = await service.create({ ...writeInput, name: 'Cascading tour' })
    const pointIds = created.points.map((point) => point.id)
    const pathIds = created.paths.map((path) => path.id)

    await service.delete(created.id)

    assert.equal(await prisma.tourTask.count({ where: { id: created.id } }), 0)
    assert.equal(await prisma.tourPoint.count({ where: { id: { in: pointIds } } }), 0)
    assert.equal(await prisma.tourPath.count({ where: { id: { in: pathIds } } }), 0)
    assert.equal(await prisma.taskAction.count({
      where: { OR: [{ pointId: { in: pointIds } }, { pathId: { in: pathIds } }] },
    }), 0)
    await assert.rejects(service.get(created.id), NotFoundException)
  })

  await context.test('publishes, archives, and republishes with optimistic versions', async () => {
    const created = await service.create({ ...writeInput, mapId: publishableMap.id, name: 'Lifecycle tour' })
    const published = await service.publish(created.id, { expectedVersion: created.version })
    assert.equal(published.status, 'PUBLISHED')
    assert.equal(published.version, 2)

    await assert.rejects(
      service.update(created.id, { ...writeInput, mapId: publishableMap.id, expectedVersion: published.version }),
      ConflictException,
    )

    const archived = await service.archive(created.id, { expectedVersion: published.version })
    assert.equal(archived.status, 'ARCHIVED')
    assert.equal(archived.version, published.version)

    const edited = await service.update(created.id, {
      ...writeInput,
      mapId: publishableMap.id,
      name: 'Lifecycle tour edited',
      expectedVersion: archived.version,
    })
    assert.equal(edited.status, 'DRAFT')
    assert.equal(edited.version, 3)
    assert.equal(edited.name, 'Lifecycle tour edited')

    const republished = await service.publish(created.id, { expectedVersion: edited.version })
    assert.equal(republished.status, 'PUBLISHED')
    assert.equal(republished.version, 4)
  })

  await context.test('rejects incomplete map assets at publish time', async () => {
    const created = await service.create({ ...writeInput, name: 'Incomplete map tour' })
    await assert.rejects(service.publish(created.id, { expectedVersion: created.version }), BadRequestException)
  })
})
