import { BadRequestException, PayloadTooLargeException } from '@nestjs/common'
import type { Multipart, MultipartFile } from '@fastify/multipart'
import type { MapUploadFile, MapUploadInput } from './map.dto'
import { getMapUploadLimits } from './map-upload-limits'

export interface MapMultipartRequest {
  isMultipart(): boolean
  parts(options?: { limits?: Record<string, number> }): AsyncIterableIterator<Multipart>
}

async function readFilePart(part: MultipartFile, maxBytes: number): Promise<MapUploadFile> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of part.file) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += value.length
    if (size > maxBytes) {
      part.file.destroy()
      throw new PayloadTooLargeException({ code: 'MAP_FILE_TOO_LARGE', message: `${part.filename} 超过允许大小` })
    }
    chunks.push(value)
  }
  if (part.file.truncated) {
    throw new PayloadTooLargeException({ code: 'MAP_FILE_TOO_LARGE', message: `${part.filename} 超过允许大小` })
  }
  return { fileName: part.filename, mediaType: part.mimetype, value: Buffer.concat(chunks, size) }
}

export async function parseMapUploadRequest(request: MapMultipartRequest): Promise<MapUploadInput> {
  if (!request.isMultipart()) {
    throw new BadRequestException({ code: 'MULTIPART_REQUIRED', message: '地图上传必须使用 multipart/form-data' })
  }
  const limits = getMapUploadLimits()
  let name: string | undefined
  let pcd: MapUploadFile | undefined
  let preview: MapUploadFile | undefined
  let metadata: MapUploadFile | undefined

  const parts = request.parts({
    limits: {
      files: 3,
      fields: 1,
      parts: 4,
      fieldNameSize: 80,
      fieldSize: 512,
      fileSize: limits.pcdBytes,
    },
  })
  for await (const part of parts) {
    if (part.type === 'field') {
      if (part.fieldname !== 'name' || name !== undefined || part.valueTruncated) {
        throw new BadRequestException({ code: 'INVALID_MAP_UPLOAD', message: '地图名称字段无效' })
      }
      name = String(part.value).trim()
      continue
    }

    if (part.fieldname === 'pcd' && !pcd) pcd = await readFilePart(part, limits.pcdBytes)
    else if (part.fieldname === 'preview' && !preview) preview = await readFilePart(part, limits.previewBytes)
    else if (part.fieldname === 'metadata' && !metadata) metadata = await readFilePart(part, limits.metadataBytes)
    else {
      part.file.resume()
      throw new BadRequestException({ code: 'INVALID_MAP_UPLOAD', message: `不支持或重复的上传字段：${part.fieldname}` })
    }
  }

  if (!name || name.length > 120) {
    throw new BadRequestException({ code: 'INVALID_MAP_NAME', message: '地图名称长度必须为 1 至 120 个字符' })
  }
  if (!pcd || !preview || !metadata) {
    throw new BadRequestException({ code: 'MAP_BUNDLE_INCOMPLETE', message: '请同时上传 PCD、PNG 和配准 JSON' })
  }
  return { name, pcd, preview, metadata }
}
