import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { MapAsset, Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { mapRegistrationMetadataSchema } from '@guide/contracts'
import type { MapAssetDetail, MapAssetListPage, MapAssetSummary, MapRegistrationMetadata } from '@guide/contracts'
import { PrismaService } from '../database/prisma.service'
import { CurrentUserService } from '../identity/current-user.service'
import type { ListMapsQuery, MapUploadInput, RenameMapDto } from './map.dto'
import { validateMapBundle } from './map-file-validation'
import { MapStorageService } from './map-storage.provider'

type MapWithCount = MapAsset & { _count: { tourTasks: number } }

function registrationFor(map: MapAsset): MapRegistrationMetadata | null {
  const result = mapRegistrationMetadataSchema.safeParse(map.registrationMetadata)
  return result.success ? result.data : null
}

function toSummary(map: MapAsset): MapAssetSummary {
  return {
    id: map.id,
    name: map.name,
    pcdFileName: map.originalFileName,
    pcdEncoding: map.pcdEncoding === 'ascii' || map.pcdEncoding === 'binary' || map.pcdEncoding === 'binary_compressed'
      ? map.pcdEncoding
      : null,
    pcdSizeBytes: map.sizeBytes,
    previewAvailable: Boolean(map.previewStorageKey && registrationFor(map)),
    version: map.version,
    createdAt: map.createdAt.toISOString(),
    updatedAt: map.updatedAt.toISOString(),
  }
}

function toDetail(map: MapWithCount): MapAssetDetail {
  const registration = registrationFor(map)
  const previewAvailable = Boolean(
    map.previewStorageKey
      && map.previewOriginalFileName
      && map.previewMediaType
      && map.previewSizeBytes !== null
      && registration,
  )
  return {
    ...toSummary(map),
    previewAvailable,
    pcd: {
      fileName: map.originalFileName,
      mediaType: map.mediaType,
      sizeBytes: map.sizeBytes,
      checksumSha256: map.checksumSha256,
      encoding: toSummary(map).pcdEncoding,
    },
    preview: previewAvailable && registration ? {
      fileName: map.previewOriginalFileName!,
      mediaType: map.previewMediaType!,
      sizeBytes: map.previewSizeBytes!,
      checksumSha256: map.previewChecksumSha256,
      url: `/api/v1/maps/${map.id}/preview`,
      width: registration.width,
      height: registration.height,
    } : null,
    registration,
    referencedTaskCount: map._count.tourTasks,
  }
}

@Injectable()
export class MapsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CurrentUserService) private readonly currentUser: CurrentUserService,
    @Inject(MapStorageService) private readonly storage: MapStorageService,
  ) {}

  async list(query: ListMapsQuery): Promise<MapAssetListPage> {
    const user = await this.currentUser.getCurrentUser()
    const maps = await this.prisma.mapAsset.findMany({
      where: { ownerId: user.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      cursor: query.cursor ? { id: query.cursor } : undefined,
      skip: query.cursor ? 1 : 0,
      take: query.limit + 1,
    })
    const hasNextPage = maps.length > query.limit
    const items = hasNextPage ? maps.slice(0, query.limit) : maps
    return {
      items: items.map(toSummary),
      nextCursor: hasNextPage ? items.at(-1)?.id : undefined,
    }
  }

  async get(mapId: string): Promise<MapAssetDetail> {
    const user = await this.currentUser.getCurrentUser()
    const map = await this.prisma.mapAsset.findFirst({
      where: { id: mapId, ownerId: user.id },
      include: { _count: { select: { tourTasks: true } } },
    })
    if (!map) throw new NotFoundException('地图不存在')
    return toDetail(map)
  }

  async create(input: MapUploadInput): Promise<MapAssetDetail> {
    const [user, validated] = await Promise.all([
      this.currentUser.getCurrentUser(),
      Promise.resolve(validateMapBundle(input.pcd, input.preview, input.metadata)),
    ])
    const mapId = randomUUID()
    const stored = await this.storage.save(mapId, input.pcd.value, input.preview.value)
    try {
      const map = await this.prisma.mapAsset.create({
        data: {
          id: mapId,
          ownerId: user.id,
          name: input.name.trim(),
          storageKey: stored.pcdStorageKey,
          originalFileName: input.pcd.fileName,
          mediaType: input.pcd.mediaType || 'application/octet-stream',
          sizeBytes: input.pcd.value.length,
          pcdEncoding: validated.pcdEncoding,
          checksumSha256: validated.pcdChecksumSha256,
          previewStorageKey: stored.previewStorageKey,
          previewOriginalFileName: input.preview.fileName,
          previewMediaType: 'image/png',
          previewSizeBytes: input.preview.value.length,
          previewChecksumSha256: validated.previewChecksumSha256,
          registrationMetadata: validated.registration as Prisma.InputJsonValue,
        },
        include: { _count: { select: { tourTasks: true } } },
      })
      return toDetail(map)
    } catch (error) {
      await this.storage.delete(mapId)
      throw error
    }
  }

  async rename(mapId: string, input: RenameMapDto): Promise<MapAssetDetail> {
    const user = await this.currentUser.getCurrentUser()
    const result = await this.prisma.mapAsset.updateMany({
      where: { id: mapId, ownerId: user.id, version: input.expectedVersion },
      data: { name: input.name.trim(), version: { increment: 1 } },
    })
    if (result.count === 0) {
      const exists = await this.prisma.mapAsset.findFirst({ where: { id: mapId, ownerId: user.id }, select: { id: true } })
      if (!exists) throw new NotFoundException('地图不存在')
      throw new ConflictException({ code: 'VERSION_CONFLICT', message: '地图已被其他会话修改，请刷新后重试' })
    }
    return this.get(mapId)
  }

  async delete(mapId: string): Promise<void> {
    const user = await this.currentUser.getCurrentUser()
    const map = await this.prisma.mapAsset.findFirst({
      where: { id: mapId, ownerId: user.id },
      select: { id: true, _count: { select: { tourTasks: true } } },
    })
    if (!map) throw new NotFoundException('地图不存在')
    if (map._count.tourTasks > 0) {
      throw new ConflictException({ code: 'RESOURCE_IN_USE', message: `地图正被 ${map._count.tourTasks} 个导览任务使用，无法删除` })
    }
    await this.prisma.mapAsset.delete({ where: { id: map.id } })
    await this.storage.delete(map.id)
  }

  async readPreview(mapId: string) {
    const user = await this.currentUser.getCurrentUser()
    const map = await this.prisma.mapAsset.findFirst({
      where: { id: mapId, ownerId: user.id },
      select: { previewStorageKey: true, previewMediaType: true },
    })
    if (!map?.previewStorageKey) throw new NotFoundException('地图预览不存在')
    return {
      mediaType: map.previewMediaType ?? 'image/png',
      value: await this.storage.read(map.previewStorageKey),
    }
  }
}
