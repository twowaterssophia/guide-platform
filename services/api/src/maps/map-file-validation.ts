import { BadRequestException } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { mapRegistrationMetadataSchema } from '@guide/contracts'
import type { MapRegistrationMetadata, PcdEncoding } from '@guide/contracts'

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export interface ValidatedMapBundle {
  pcdEncoding: PcdEncoding
  pcdChecksumSha256: string
  previewChecksumSha256: string
  previewWidth: number
  previewHeight: number
  registration: MapRegistrationMetadata
}

export function sha256(value: Buffer) {
  return createHash('sha256').update(value).digest('hex')
}

export function parsePcdEncoding(fileName: string, value: Buffer): PcdEncoding {
  if (!fileName.toLowerCase().endsWith('.pcd')) {
    throw new BadRequestException({ code: 'INVALID_MAP_FILE', message: '三维地图文件必须为 .pcd' })
  }
  const header = value.subarray(0, Math.min(value.length, 64 * 1024)).toString('latin1')
  if (!/^VERSION\s+\S+/im.test(header) || !/^FIELDS\s+\S+/im.test(header)) {
    throw new BadRequestException({ code: 'INVALID_PCD', message: 'PCD 文件头缺少 VERSION 或 FIELDS' })
  }
  const dataMatch = header.match(/^DATA\s+(ascii|binary|binary_compressed)\s*$/im)
  if (!dataMatch) {
    throw new BadRequestException({ code: 'INVALID_PCD', message: 'PCD 文件缺少受支持的 DATA 编码' })
  }
  return dataMatch[1].toLowerCase() as PcdEncoding
}

export function parsePngDimensions(fileName: string, value: Buffer) {
  if (!fileName.toLowerCase().endsWith('.png') || value.length < 24 || !value.subarray(0, 8).equals(pngSignature)) {
    throw new BadRequestException({ code: 'INVALID_MAP_PREVIEW', message: '二维地图必须为有效的 PNG 文件' })
  }
  const width = value.readUInt32BE(16)
  const height = value.readUInt32BE(20)
  if (width === 0 || height === 0) {
    throw new BadRequestException({ code: 'INVALID_MAP_PREVIEW', message: 'PNG 尺寸无效' })
  }
  return { width, height }
}

export function parseRegistrationMetadata(fileName: string, value: Buffer) {
  if (!fileName.toLowerCase().endsWith('.json')) {
    throw new BadRequestException({ code: 'INVALID_MAP_METADATA', message: '配准元数据必须为 .json' })
  }
  let json: unknown
  try {
    json = JSON.parse(value.toString('utf8'))
  } catch {
    throw new BadRequestException({ code: 'INVALID_MAP_METADATA', message: '配准元数据不是有效 JSON' })
  }
  const result = mapRegistrationMetadataSchema.safeParse(json)
  if (!result.success) {
    throw new BadRequestException({
      code: 'INVALID_MAP_METADATA',
      message: result.error.issues.map((issue) => issue.message).join('；'),
    })
  }
  return result.data
}

export function validateMapBundle(
  pcd: { fileName: string; value: Buffer },
  preview: { fileName: string; value: Buffer },
  metadata: { fileName: string; value: Buffer },
): ValidatedMapBundle {
  const pcdEncoding = parsePcdEncoding(pcd.fileName, pcd.value)
  const dimensions = parsePngDimensions(preview.fileName, preview.value)
  const registration = parseRegistrationMetadata(metadata.fileName, metadata.value)
  if (registration.width !== dimensions.width || registration.height !== dimensions.height) {
    throw new BadRequestException({ code: 'MAP_DIMENSION_MISMATCH', message: 'PNG 尺寸与配准元数据不一致' })
  }
  return {
    pcdEncoding,
    pcdChecksumSha256: sha256(pcd.value),
    previewChecksumSha256: sha256(preview.value),
    previewWidth: dimensions.width,
    previewHeight: dimensions.height,
    registration,
  }
}
