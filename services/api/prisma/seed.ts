import { PrismaClient, TourTaskStatus } from '@prisma/client'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { demoPcd, demoPreview, demoRegistration } from '../src/demo-data/demo-map'
import { demoKnowledgePlugin, demoPersona, demoTour } from '../src/demo-data/demo-tour'

const prisma = new PrismaClient()
const demoUserEmail = process.env.DEMO_USER_EMAIL ?? 'guide@booster.tech'

async function writeDemoMapBundle() {
  const root = resolve(process.env.MAP_STORAGE_ROOT ?? './storage/maps')
  const directory = resolve(root, 'demo-wangfujing-map')
  await mkdir(directory, { recursive: true })
  await Promise.all([
    writeFile(resolve(directory, 'map.pcd'), demoPcd),
    writeFile(resolve(directory, 'map.png'), demoPreview),
  ])
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: demoUserEmail },
    update: {},
    create: {
      externalId: 'demo-guide-user',
      email: demoUserEmail,
      displayName: '导览演示账号',
    },
  })

  await prisma.persona.upsert({
    where: { id: '__system_default__' },
    update: {},
    create: {
      id: '__system_default__',
      name: '默认',
      voice: 'female',
      isSystemDefault: true,
      presetSkillsEnabled: true,
    },
  })

  const map = await prisma.mapAsset.upsert({
    where: { id: 'demo-wangfujing-map' },
    update: {
      storageKey: 'demo-wangfujing-map/map.pcd',
      originalFileName: 'wangfujing-station-hall.pcd',
      mediaType: 'application/octet-stream',
      sizeBytes: demoPcd.length,
      pcdEncoding: 'ascii',
      previewStorageKey: 'demo-wangfujing-map/map.png',
      previewOriginalFileName: 'wangfujing-station-hall.png',
      previewMediaType: 'image/png',
      previewSizeBytes: demoPreview.length,
      registrationMetadata: demoRegistration,
    },
    create: {
      id: 'demo-wangfujing-map',
      ownerId: user.id,
      name: '王府井站站厅',
      storageKey: 'demo-wangfujing-map/map.pcd',
      originalFileName: 'wangfujing-station-hall.pcd',
      mediaType: 'application/octet-stream',
      sizeBytes: demoPcd.length,
      pcdEncoding: 'ascii',
      previewStorageKey: 'demo-wangfujing-map/map.png',
      previewOriginalFileName: 'wangfujing-station-hall.png',
      previewMediaType: 'image/png',
      previewSizeBytes: demoPreview.length,
      registrationMetadata: demoRegistration,
    },
  })

  await writeDemoMapBundle()

  const plugin = await prisma.mcpPlugin.upsert({
    where: { id: 'demo-wangfujing-plugin' },
    update: {
      ownerId: user.id,
      name: demoKnowledgePlugin.name,
      description: demoKnowledgePlugin.description,
      examples: demoKnowledgePlugin.examples,
      serviceUrl: demoKnowledgePlugin.serviceUrl,
      authType: 'NONE',
      tools: demoKnowledgePlugin.tools,
      lastRefreshedAt: new Date(),
    },
    create: {
      id: 'demo-wangfujing-plugin',
      ownerId: user.id,
      name: demoKnowledgePlugin.name,
      description: demoKnowledgePlugin.description,
      examples: demoKnowledgePlugin.examples,
      serviceUrl: demoKnowledgePlugin.serviceUrl,
      authType: 'NONE',
      tools: demoKnowledgePlugin.tools,
      lastRefreshedAt: new Date(),
    },
  })
  const persona = await prisma.persona.upsert({
    where: { id: 'demo-wangfujing-persona' },
    update: {
      ownerId: user.id,
      name: demoPersona.name,
      voice: demoPersona.voice,
      prompt: demoPersona.prompt,
      presetSkillsEnabled: demoPersona.presetSkillsEnabled,
      pluginLinks: { deleteMany: {}, create: { pluginId: plugin.id } },
    },
    create: {
      id: 'demo-wangfujing-persona',
      ownerId: user.id,
      name: demoPersona.name,
      voice: demoPersona.voice,
      prompt: demoPersona.prompt,
      presetSkillsEnabled: demoPersona.presetSkillsEnabled,
      pluginLinks: { create: { pluginId: plugin.id } },
    },
  })

  await prisma.agentDownload.deleteMany({ where: { tourTaskId: 'demo-wangfujing-tour' } })
  await prisma.tourTask.deleteMany({ where: { id: 'demo-wangfujing-tour' } })
  const task = await prisma.tourTask.create({
    data: {
      id: 'demo-wangfujing-tour',
      ownerId: user.id,
      name: demoTour.name,
      mapId: map.id,
      personaId: persona.id,
      status: TourTaskStatus.PUBLISHED,
      points: { create: demoTour.points.map((point, index) => ({
        sequence: index + 1,
        name: point.name,
        x: point.x,
        y: point.y,
        angle: point.angle,
        actions: { create: point.actions.map((action, actionIndex) => action.type === 'SKILL'
          ? { sequence: actionIndex + 1, type: action.type, skillId: action.skillId, skillName: action.skillName }
          : { sequence: actionIndex + 1, type: action.type, narration: action.narration }) },
      })) },
    },
    include: { points: { orderBy: { sequence: 'asc' } } },
  })
  const pointIds = new Map(task.points.map((point) => [point.sequence, point.id]))
  await Promise.all(demoTour.paths.map((path, index) => prisma.tourPath.create({
    data: {
      taskId: task.id,
      sequence: index + 1,
      fromPointId: pointIds.get(path.fromSequence)!,
      toPointId: pointIds.get(path.toSequence)!,
      actions: { create: path.actions.map((action, actionIndex) => ({ sequence: actionIndex + 1, type: action.type, narration: action.narration })) },
    },
  })))
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    await prisma.$disconnect()
    throw error
  })
