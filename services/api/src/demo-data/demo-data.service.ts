import { Inject, Injectable } from '@nestjs/common'
import { TourTaskStatus } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { PrismaService } from '../database/prisma.service'
import { CurrentUserService } from '../identity/current-user.service'
import { MapStorageService } from '../maps/map-storage.provider'
import { demoPcd, demoPreview, demoRegistration } from './demo-map'
import { demoKnowledgePlugin, demoPersona, demoTour } from './demo-tour'

@Injectable()
export class DemoDataService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CurrentUserService) private readonly currentUser: CurrentUserService,
    @Inject(MapStorageService) private readonly storage: MapStorageService,
  ) {}

  async resetCurrentUser() {
    const user = await this.currentUser.getCurrentUser()
    const existingMaps = await this.prisma.mapAsset.findMany({ where: { ownerId: user.id }, select: { id: true } })
    const mapId = randomUUID()
    const stored = await this.storage.save(mapId, demoPcd, demoPreview)

    try {
      await this.prisma.$transaction(async (transaction) => {
        await transaction.tourTask.deleteMany({ where: { ownerId: user.id } })
        await transaction.persona.deleteMany({ where: { ownerId: user.id } })
        await transaction.mcpPlugin.deleteMany({ where: { ownerId: user.id } })
        await transaction.mapAsset.deleteMany({ where: { ownerId: user.id } })
        await transaction.persona.upsert({
          where: { id: '__system_default__' },
          update: { name: '默认', voice: 'female', prompt: '', isSystemDefault: true, presetSkillsEnabled: true },
          create: { id: '__system_default__', name: '默认', voice: 'female', prompt: '', isSystemDefault: true, presetSkillsEnabled: true },
        })
        await transaction.mapAsset.create({
          data: {
            id: mapId,
            ownerId: user.id,
            name: '王府井站站厅',
            storageKey: stored.pcdStorageKey,
            originalFileName: 'wangfujing-station-hall.pcd',
            mediaType: 'application/octet-stream',
            sizeBytes: demoPcd.length,
            pcdEncoding: 'ascii',
            previewStorageKey: stored.previewStorageKey,
            previewOriginalFileName: 'wangfujing-station-hall.png',
            previewMediaType: 'image/png',
            previewSizeBytes: demoPreview.length,
            registrationMetadata: demoRegistration,
          },
        })
        const plugin = await transaction.mcpPlugin.create({
          data: {
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
        const persona = await transaction.persona.create({
          data: {
            ownerId: user.id,
            name: demoPersona.name,
            voice: demoPersona.voice,
            prompt: demoPersona.prompt,
            presetSkillsEnabled: demoPersona.presetSkillsEnabled,
            pluginLinks: { create: { pluginId: plugin.id } },
          },
        })
        const task = await transaction.tourTask.create({
          data: {
            ownerId: user.id,
            name: demoTour.name,
            mapId,
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
        await Promise.all(demoTour.paths.map((path, index) => transaction.tourPath.create({
          data: {
            taskId: task.id,
            sequence: index + 1,
            fromPointId: pointIds.get(path.fromSequence)!,
            toPointId: pointIds.get(path.toSequence)!,
            actions: { create: path.actions.map((action, actionIndex) => ({ sequence: actionIndex + 1, type: action.type, narration: action.narration })) },
          },
        })))
      })
    } catch (error) {
      await this.storage.delete(mapId).catch(() => undefined)
      throw error
    }

    await Promise.all(existingMaps.map((map) => this.storage.delete(map.id).catch(() => undefined)))
  }
}
