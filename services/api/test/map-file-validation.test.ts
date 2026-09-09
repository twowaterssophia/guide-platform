import assert from 'node:assert/strict'
import test from 'node:test'
import { BadRequestException } from '@nestjs/common'
import { parsePcdEncoding, parsePngDimensions, parseRegistrationMetadata } from '../src/maps/map-file-validation'

function pngHeader(width: number, height: number) {
  const buffer = Buffer.alloc(24)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer)
  buffer.writeUInt32BE(width, 16)
  buffer.writeUInt32BE(height, 20)
  return buffer
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
