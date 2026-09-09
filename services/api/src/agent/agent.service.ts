import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma, TaskAction as PrismaTaskAction, TourPath, TourPoint, TourTask } from '@prisma/client'
import { mapRegistrationMetadataSchema } from '@guide/contracts'
import type { AgentTaskList, AgentTaskPackage, AgentTaskSummary, TaskAction, TourPath as ContractTourPath, TourPoint as ContractTourPoint, TourTaskDetail } from '@guide/contracts'
import { PrismaService } from '../database/prisma.service'
import { CurrentUserService } from '../identity/current-user.service'
import { MapStorageService } from '../maps/map-storage.provider'

type TaskWithPackageRelations = TourTask & {
  map: {
    id: string
    name: string
    storageKey: string
    originalFileName: string
    mediaType: string
    sizeBytes: number
    pcdEncoding: string | null
    checksumSha256: string | null
    previewStorageKey: string | null
    previewOriginalFileName: string | null
    previewMediaType: string | null
    previewSizeBytes: number | null
    previewChecksumSha256: string | null
    registrationMetadata: Prisma.JsonValue | null
    version: number
  }
  persona: { id: string; name: string; isSystemDefault: boolean } | null
  points: (TourPoint & { actions: PrismaTaskAction[] })[]
  paths: (TourPath & { actions: PrismaTaskAction[] })[]
}

function taskAction(action: PrismaTaskAction): TaskAction {
  if (action.type === 'SPEECH') return {
    id: action.id,
    sequence: action.sequence,
    type: 'SPEECH',
    narration: action.narration ?? '',
  }
  if (action.type === 'SKILL') return {
    id: action.id,
    sequence: action.sequence,
    type: 'SKILL',
    skillId: action.skillId ?? '',
    skillName: action.skillName ?? '',
  }
  return {
    id: action.id,
    sequence: action.sequence,
    type: 'INTERACTION',
    interactionPrompt: action.interactionPrompt,
  }
}

function taskPoint(point: TourPoint & { actions: PrismaTaskAction[] }): ContractTourPoint {
  return {
    id: point.id,
    sequence: point.sequence,
    name: point.name,
    x: point.x,
    y: point.y,
    angle: point.angle,
    actions: point.actions.sort((left, right) => left.sequence - right.sequence).map(taskAction),
  }
}

function taskPath(path: TourPath & { actions: PrismaTaskAction[] }): ContractTourPath {
  return {
    id: path.id,
    sequence: path.sequence,
    fromPointId: path.fromPointId,
    toPointId: path.toPointId,
    actions: path.actions.sort((left, right) => left.sequence - right.sequence).map((action) => taskAction(action) as ContractTourPath['actions'][number]),
  }
}

function taskDetail(task: TaskWithPackageRelations): TourTaskDetail {
  return {
    id: task.id,
    name: task.name,
    map: { id: task.map.id, name: task.map.name },
    persona: task.persona ? { id: task.persona.id, name: task.persona.name, isSystemDefault: task.persona.isSystemDefault } : null,
    status: task.status,
    version: task.version,
    points: task.points.sort((left, right) => left.sequence - right.sequence).map(taskPoint),
    paths: task.paths.sort((left, right) => left.sequence - right.sequence).map(taskPath),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }
}

function syncState(publishedVersion: number, downloadedVersion: number | null): AgentTaskSummary['syncState'] {
  if (downloadedVersion === null) return 'AVAILABLE'
  return downloadedVersion < publishedVersion ? 'UPDATE_AVAILABLE' : 'DOWNLOADED'
}

@Injectable()
export class AgentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CurrentUserService) private readonly currentUser: CurrentUserService,
    @Inject(MapStorageService) private readonly storage: MapStorageService,
  ) {}

  async list(deviceId: string): Promise<AgentTaskList> {
    const user = await this.currentUser.getCurrentUser()
    const tasks = await this.prisma.tourTask.findMany({
      where: { ownerId: user.id, status: 'PUBLISHED' },
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        version: true,
        updatedAt: true,
        map: { select: { name: true } },
        _count: { select: { points: true } },
        downloads: { where: { deviceId }, select: { downloadedVersion: true } },
      },
    })
    return {
      deviceId,
      items: tasks.map((task): AgentTaskSummary => {
        const downloadedVersion = task.downloads[0]?.downloadedVersion ?? null
        return {
          id: task.id,
          name: task.name,
          mapName: task.map.name,
          pointCount: task._count.points,
          publishedVersion: task.version,
          downloadedVersion,
          syncState: syncState(task.version, downloadedVersion),
          updatedAt: task.updatedAt.toISOString(),
        }
      }),
    }
  }

  async download(taskId: string, deviceId: string): Promise<AgentTaskPackage> {
    const user = await this.currentUser.getCurrentUser()
    const task = await this.prisma.tourTask.findFirst({
      where: { id: taskId, ownerId: user.id, status: 'PUBLISHED' },
      include: {
        map: true,
        persona: { select: { id: true, name: true, isSystemDefault: true } },
        points: { include: { actions: true }, orderBy: { sequence: 'asc' } },
        paths: { include: { actions: true }, orderBy: { sequence: 'asc' } },
      },
    }) as TaskWithPackageRelations | null
    if (!task) throw new NotFoundException('已发布导览任务不存在')

    const registrationResult = mapRegistrationMetadataSchema.safeParse(task.map.registrationMetadata)
    const mapReady = Boolean(
      task.map.storageKey
        && task.map.originalFileName.toLowerCase().endsWith('.pcd')
        && task.map.pcdEncoding
        && task.map.previewStorageKey
        && task.map.previewOriginalFileName
        && task.map.previewMediaType === 'image/png'
        && task.map.previewSizeBytes !== null
        && registrationResult.success,
    )
    if (!mapReady || !registrationResult.success || !task.map.previewStorageKey) {
      throw new ConflictException({ code: 'MAP_PACKAGE_UNAVAILABLE', message: '任务绑定的地图尚未完成 PCD、PNG 和配准数据，暂时无法下载' })
    }

    let pcd: Buffer
    let preview: Buffer
    try {
      ;[pcd, preview] = await Promise.all([
        this.storage.read(task.map.storageKey),
        this.storage.read(task.map.previewStorageKey),
      ])
    } catch {
      throw new ConflictException({ code: 'MAP_PACKAGE_UNAVAILABLE', message: '地图文件暂时无法读取，请稍后重试' })
    }

    const downloadedAt = new Date()
    await this.prisma.agentDownload.upsert({
      where: { deviceId_tourTaskId: { deviceId, tourTaskId: task.id } },
      create: { ownerId: user.id, deviceId, tourTaskId: task.id, downloadedVersion: task.version, downloadedAt },
      update: { downloadedVersion: task.version, downloadedAt },
    })

    return {
      task: taskDetail(task),
      map: {
        id: task.map.id,
        name: task.map.name,
        version: task.map.version,
        registration: registrationResult.data,
        pcd: {
          fileName: task.map.originalFileName,
          mediaType: task.map.mediaType,
          encoding: task.map.pcdEncoding as 'ascii' | 'binary' | 'binary_compressed',
          sizeBytes: task.map.sizeBytes,
          contentBase64: pcd.toString('base64'),
        },
        preview: {
          fileName: task.map.previewOriginalFileName!,
          mediaType: 'image/png',
          sizeBytes: task.map.previewSizeBytes!,
          contentBase64: preview.toString('base64'),
        },
      },
      downloadedVersion: task.version,
      downloadedAt: downloadedAt.toISOString(),
    }
  }

  async remove(taskId: string, deviceId: string): Promise<void> {
    const user = await this.currentUser.getCurrentUser()
    const deleted = await this.prisma.agentDownload.deleteMany({ where: { ownerId: user.id, tourTaskId: taskId, deviceId } })
    if (deleted.count === 0) throw new NotFoundException('设备尚未下载此导览任务')
  }
}
