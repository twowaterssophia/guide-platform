import { mapAssetDetailSchema, mapAssetListPageSchema } from '@guide/contracts'
import type { MapAssetRenameInput } from '@guide/contracts'
import { deleteResource, getApiAssetUrl, getJson, patchJson, postForm } from '../../api/client'

export const mapsQueryKey = ['maps'] as const

export async function listMaps() {
  return mapAssetListPageSchema.parse(await getJson('/maps'))
}

export async function getMap(mapId: string) {
  return mapAssetDetailSchema.parse(await getJson(`/maps/${mapId}`))
}

export async function uploadMap(input: { name: string; bundle: File }) {
  const form = new FormData()
  form.append('name', input.name)
  form.append('bundle', input.bundle)
  return mapAssetDetailSchema.parse(await postForm('/maps', form))
}

export async function renameMap(mapId: string, input: MapAssetRenameInput) {
  return mapAssetDetailSchema.parse(await patchJson(`/maps/${mapId}`, input))
}

export async function deleteMap(mapId: string) {
  await deleteResource(`/maps/${mapId}`)
}

export function mapPreviewUrl(path: string) {
  return getApiAssetUrl(path)
}
