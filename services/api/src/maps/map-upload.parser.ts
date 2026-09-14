import { BadRequestException, PayloadTooLargeException } from '@nestjs/common'
import type { Multipart, MultipartFile } from '@fastify/multipart'
import path from 'node:path'
import yauzl from 'yauzl'
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

function invalidBundle(message: string): never {
  throw new BadRequestException({ code: 'INVALID_MAP_BUNDLE', message })
}

function openArchive(value: Buffer) {
  return new Promise<yauzl.ZipFile>((resolve, reject) => {
    yauzl.fromBuffer(value, { decodeStrings: true, lazyEntries: true, strictFileNames: true, validateEntrySizes: true }, (error, archive) => {
      if (error || !archive) {
        reject(new BadRequestException({ code: 'INVALID_MAP_BUNDLE', message: '地图压缩包无法读取，请上传有效的 ZIP 文件' }))
        return
      }
      resolve(archive)
    })
  })
}

function nextArchiveEntry(archive: yauzl.ZipFile) {
  return new Promise<yauzl.Entry | undefined>((resolve, reject) => {
    const onEntry = (entry: yauzl.Entry) => { cleanup(); resolve(entry) }
    const onEnd = () => { cleanup(); resolve(undefined) }
    const onError = (error: Error) => { cleanup(); reject(error) }
    const cleanup = () => {
      archive.removeListener('entry', onEntry)
      archive.removeListener('end', onEnd)
      archive.removeListener('error', onError)
    }
    archive.once('entry', onEntry)
    archive.once('end', onEnd)
    archive.once('error', onError)
    archive.readEntry()
  })
}

function readArchiveEntry(archive: yauzl.ZipFile, entry: yauzl.Entry, maxBytes: number) {
  return new Promise<Buffer>((resolve, reject) => {
    archive.openReadStream(entry, (error, stream) => {
      if (error || !stream) { reject(error ?? new Error('无法读取压缩包文件')); return }
      const chunks: Buffer[] = []
      let size = 0
      stream.on('data', (chunk: Buffer) => {
        size += chunk.length
        if (size > maxBytes) {
          stream.destroy(new Error('MAP_FILE_TOO_LARGE'))
          return
        }
        chunks.push(chunk)
      })
      stream.once('error', (streamError: Error) => reject(streamError))
      stream.once('end', () => resolve(Buffer.concat(chunks, size)))
    })
  })
}

function validateEntryName(fileName: string) {
  if (!fileName || fileName.includes('\\') || fileName.startsWith('/') || fileName.split('/').some((part) => part === '..')) {
    invalidBundle('压缩包中包含不安全的文件路径')
  }
}

export async function parseMapBundle(bundle: MapUploadFile): Promise<MapUploadInput> {
  if (!bundle.fileName.toLowerCase().endsWith('.zip')) {
    throw new BadRequestException({ code: 'INVALID_MAP_BUNDLE', message: '地图包必须为 .zip 文件' })
  }
  const limits = getMapUploadLimits()
  const archive = await openArchive(bundle.value)
  const files: Partial<Record<'pcd' | 'preview' | 'metadata', MapUploadFile>> = {}
  let entries = 0
  try {
    while (true) {
      const entry = await nextArchiveEntry(archive)
      if (!entry) break
      entries += 1
      if (entries > 20) invalidBundle('压缩包内文件过多')
      if (entry.fileName.endsWith('/')) continue
      validateEntryName(entry.fileName)
      const extension = path.posix.extname(entry.fileName).toLowerCase()
      const key = extension === '.pcd' ? 'pcd' : extension === '.png' ? 'preview' : extension === '.json' ? 'metadata' : undefined
      if (!key || files[key]) invalidBundle('压缩包中只能包含一个 PCD、一个 PNG 和一个 JSON 文件')
      const limit = key === 'pcd' ? limits.pcdBytes : key === 'preview' ? limits.previewBytes : limits.metadataBytes
      if (entry.uncompressedSize > limit) {
        throw new PayloadTooLargeException({ code: 'MAP_FILE_TOO_LARGE', message: `${path.posix.basename(entry.fileName)} 超过允许大小` })
      }
      let value: Buffer
      try {
        value = await readArchiveEntry(archive, entry, limit)
      } catch (error) {
        if (error instanceof Error && error.message === 'MAP_FILE_TOO_LARGE') {
          throw new PayloadTooLargeException({ code: 'MAP_FILE_TOO_LARGE', message: `${path.posix.basename(entry.fileName)} 超过允许大小` })
        }
        throw error
      }
      files[key] = {
        fileName: path.posix.basename(entry.fileName),
        mediaType: key === 'preview' ? 'image/png' : key === 'metadata' ? 'application/json' : 'application/octet-stream',
        value,
      }
    }
  } catch (error) {
    if (error instanceof BadRequestException || error instanceof PayloadTooLargeException) throw error
    throw new BadRequestException({ code: 'INVALID_MAP_BUNDLE', message: '地图压缩包无法读取，请重新打包后上传' })
  } finally {
    archive.close()
  }
  if (!files.pcd || !files.preview || !files.metadata) {
    throw new BadRequestException({ code: 'MAP_BUNDLE_INCOMPLETE', message: '压缩包内必须包含 PCD、PNG 和配准 JSON' })
  }
  return { name: '', pcd: files.pcd, preview: files.preview, metadata: files.metadata }
}

export async function parseMapUploadRequest(request: MapMultipartRequest): Promise<MapUploadInput> {
  if (!request.isMultipart()) {
    throw new BadRequestException({ code: 'MULTIPART_REQUIRED', message: '地图上传必须使用 multipart/form-data' })
  }
  const limits = getMapUploadLimits()
  let name: string | undefined
  let bundle: MapUploadFile | undefined

  const parts = request.parts({
    limits: {
      files: 1,
      fields: 1,
      parts: 2,
      fieldNameSize: 80,
      fieldSize: 512,
      fileSize: limits.bundleBytes,
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

    if (part.fieldname === 'bundle' && !bundle) bundle = await readFilePart(part, limits.bundleBytes)
    else {
      part.file.resume()
      throw new BadRequestException({ code: 'INVALID_MAP_UPLOAD', message: `不支持或重复的上传字段：${part.fieldname}` })
    }
  }

  if (!name || name.length > 120) {
    throw new BadRequestException({ code: 'INVALID_MAP_NAME', message: '地图名称长度必须为 1 至 120 个字符' })
  }
  if (!bundle) {
    throw new BadRequestException({ code: 'MAP_BUNDLE_INCOMPLETE', message: '请上传包含 PCD、PNG 和配准 JSON 的 ZIP 地图包' })
  }
  const parsed = await parseMapBundle(bundle)
  return { ...parsed, name }
}
