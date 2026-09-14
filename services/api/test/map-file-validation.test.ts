import assert from 'node:assert/strict'
import test from 'node:test'
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common'
import { parsePcdEncoding, parsePngDimensions, parseRegistrationMetadata } from '../src/maps/map-file-validation'
import { parseMapBundle } from '../src/maps/map-upload.parser'

function pngHeader(width: number, height: number) {
  const buffer = Buffer.alloc(24)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer)
  buffer.writeUInt32BE(width, 16)
  buffer.writeUInt32BE(height, 20)
  return buffer
}

function crc32(value: Buffer) {
  let crc = 0xffffffff
  for (const byte of value) {
    crc ^= byte
    for (let index = 0; index < 8; index += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function zip(entries: Array<{ name: string; value: Buffer }>) {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0
  for (const entry of entries) {
    const name = Buffer.from(entry.name)
    const checksum = crc32(entry.value)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt32LE(checksum, 14)
    local.writeUInt32LE(entry.value.length, 18)
    local.writeUInt32LE(entry.value.length, 22)
    local.writeUInt16LE(name.length, 26)
    localParts.push(local, name, entry.value)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt32LE(checksum, 16)
    central.writeUInt32LE(entry.value.length, 20)
    central.writeUInt32LE(entry.value.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    centralParts.push(central, name)
    offset += local.length + name.length + entry.value.length
  }
  const centralSize = centralParts.reduce((size, part) => size + part.length, 0)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralSize, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...localParts, ...centralParts, end])
}

function mapBundle(entries: Array<{ name: string; value: Buffer }>) {
  return { fileName: 'map.zip', mediaType: 'application/zip', value: zip(entries) }
}

test('detects supported PCD encodings', () => {
  const value = Buffer.from('# .PCD v0.7\nVERSION 0.7\nFIELDS x y z\nDATA binary_compressed\n')
  assert.equal(parsePcdEncoding('floor.pcd', value), 'binary_compressed')
})

test('reads PNG dimensions from IHDR', () => {
  assert.deepEqual(parsePngDimensions('floor.png', pngHeader(640, 480)), { width: 640, height: 480 })
})

test('rejects metadata whose thresholds are inverted', () => {
  const value = Buffer.from(JSON.stringify({
    formatVersion: 1,
    resolution: 0.05,
    origin: { x: 0, y: 0, yaw: 0 },
    width: 640,
    height: 480,
    frameId: 'map',
    imageAxes: { x: 'right', y: 'down' },
    occupiedThreshold: 0.1,
    freeThreshold: 0.9,
    pcdTransform: { translation: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
  }))
  assert.throws(() => parseRegistrationMetadata('map.json', value), BadRequestException)
})

test('extracts exactly one PCD, PNG, and JSON from a map ZIP', async () => {
  const parsed = await parseMapBundle(mapBundle([
    { name: 'floor.pcd', value: Buffer.from('VERSION 0.7\nFIELDS x y z\nDATA ascii\n') },
    { name: 'floor.png', value: pngHeader(640, 480) },
    { name: 'registration.json', value: Buffer.from('{}') },
  ]))
  assert.equal(parsed.pcd.fileName, 'floor.pcd')
  assert.equal(parsed.preview.fileName, 'floor.png')
  assert.equal(parsed.metadata.fileName, 'registration.json')
})

test('rejects incomplete, duplicate, and malformed map ZIPs', async () => {
  await assert.rejects(() => parseMapBundle(mapBundle([{ name: 'floor.pcd', value: Buffer.from('pcd') }])), BadRequestException)
  await assert.rejects(() => parseMapBundle(mapBundle([
    { name: 'a.pcd', value: Buffer.from('pcd') },
    { name: 'b.pcd', value: Buffer.from('pcd') },
  ])), BadRequestException)
  await assert.rejects(() => parseMapBundle({ fileName: 'map.zip', mediaType: 'application/zip', value: Buffer.from('not-a-zip') }), BadRequestException)
})

test('rejects an extracted file beyond its configured limit', async () => {
  const previousLimit = process.env.MAP_MAX_METADATA_BYTES
  process.env.MAP_MAX_METADATA_BYTES = '8'
  try {
    await assert.rejects(() => parseMapBundle(mapBundle([
      { name: 'floor.pcd', value: Buffer.from('pcd') },
      { name: 'floor.png', value: pngHeader(1, 1) },
      { name: 'registration.json', value: Buffer.from('too-large') },
    ])), PayloadTooLargeException)
  } finally {
    if (previousLimit === undefined) delete process.env.MAP_MAX_METADATA_BYTES
    else process.env.MAP_MAX_METADATA_BYTES = previousLimit
  }
})
