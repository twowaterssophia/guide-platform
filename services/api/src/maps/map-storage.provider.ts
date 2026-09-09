import { Inject, Injectable } from '@nestjs/common'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'

export const MAP_STORAGE_PROVIDER = Symbol('MAP_STORAGE_PROVIDER')

export interface StoredMapBundle {
  pcdStorageKey: string
  previewStorageKey: string
}

export interface MapStorageProvider {
  save(mapId: string, pcd: Buffer, preview: Buffer): Promise<StoredMapBundle>
  read(storageKey: string): Promise<Buffer>
  delete(mapId: string): Promise<void>
}

function storageRoot() {
  return resolve(process.env.MAP_STORAGE_ROOT ?? './storage/maps')
}

function resolveStorageKey(key: string) {
  const root = storageRoot()
  const target = resolve(root, key)
  const pathFromRoot = relative(root, target)
  if (!pathFromRoot || pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
    throw new Error('Invalid map storage key')
  }
  return target
}

@Injectable()
export class LocalMapStorageProvider implements MapStorageProvider {
  async save(mapId: string, pcd: Buffer, preview: Buffer): Promise<StoredMapBundle> {
    if (!/^[A-Za-z0-9_-]+$/.test(mapId)) throw new Error('Invalid map ID')
    const pcdStorageKey = `${mapId}/map.pcd`
    const previewStorageKey = `${mapId}/map.png`
    const finalDirectory = dirname(resolveStorageKey(pcdStorageKey))
    const temporaryDirectory = `${finalDirectory}.tmp`
    await rm(temporaryDirectory, { recursive: true, force: true })
    await mkdir(temporaryDirectory, { recursive: true })
    try {
      await Promise.all([
        writeFile(resolve(temporaryDirectory, 'map.pcd'), pcd),
        writeFile(resolve(temporaryDirectory, 'map.png'), preview),
      ])
      await mkdir(dirname(finalDirectory), { recursive: true })
      await rename(temporaryDirectory, finalDirectory)
      return { pcdStorageKey, previewStorageKey }
    } catch (error) {
      await rm(temporaryDirectory, { recursive: true, force: true })
      throw error
    }
  }

  read(storageKey: string) {
    return readFile(resolveStorageKey(storageKey))
  }

  delete(mapId: string) {
    if (!/^[A-Za-z0-9_-]+$/.test(mapId)) throw new Error('Invalid map ID')
    return rm(resolveStorageKey(`${mapId}/map.pcd`).replace(/[\\/]map\.pcd$/, ''), { recursive: true, force: true })
  }
}

@Injectable()
export class MapStorageService {
  constructor(@Inject(MAP_STORAGE_PROVIDER) private readonly provider: MapStorageProvider) {}

  save(mapId: string, pcd: Buffer, preview: Buffer) {
    return this.provider.save(mapId, pcd, preview)
  }

  read(storageKey: string) {
    return this.provider.read(storageKey)
  }

  delete(mapId: string) {
    return this.provider.delete(mapId)
  }
}
