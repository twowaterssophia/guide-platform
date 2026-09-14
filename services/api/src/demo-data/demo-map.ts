import { deflateSync } from 'node:zlib'

export const demoMapDimensions = { width: 960, height: 960 } as const

export const demoRegistration = {
  formatVersion: 1,
  resolution: 0.05,
  origin: { x: -24, y: -24, yaw: 0 },
  width: demoMapDimensions.width,
  height: demoMapDimensions.height,
  frameId: 'wangfujing-station-hall',
  imageAxes: { x: 'right', y: 'down' },
  occupiedThreshold: 0.65,
  freeThreshold: 0.2,
  pcdTransform: { translation: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
} as const

type Rgb = readonly [number, number, number]

const previewPalette = {
  canvas: [240, 244, 249],
  floor: [255, 255, 255],
  grid: [226, 232, 239],
  wall: [97, 110, 126],
  corridor: [233, 240, 248],
  columnShadow: [185, 195, 207],
  column: [129, 143, 160],
} as const satisfies Record<string, Rgb>

function crc32(value: Buffer) {
  let crc = 0xffffffff
  for (const byte of value) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, value: Buffer) {
  const typeBytes = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(value.length)
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, value])))
  return Buffer.concat([length, typeBytes, value, checksum])
}

function previewPixelOffset(x: number, y: number) {
  return y * (demoMapDimensions.width * 4 + 1) + 1 + x * 4
}

function fillRect(pixels: Buffer, x: number, y: number, width: number, height: number, color: Rgb) {
  const left = Math.max(0, Math.floor(x))
  const top = Math.max(0, Math.floor(y))
  const right = Math.min(demoMapDimensions.width, Math.ceil(x + width))
  const bottom = Math.min(demoMapDimensions.height, Math.ceil(y + height))
  for (let row = top; row < bottom; row += 1) {
    for (let column = left; column < right; column += 1) {
      const offset = previewPixelOffset(column, row)
      pixels[offset] = color[0]
      pixels[offset + 1] = color[1]
      pixels[offset + 2] = color[2]
      pixels[offset + 3] = 255
    }
  }
}

function buildDemoPreview() {
  // PNG scanlines keep the demo asset self-contained without a graphics dependency.
  const pixels = Buffer.alloc((demoMapDimensions.width * 4 + 1) * demoMapDimensions.height)
  fillRect(pixels, 0, 0, demoMapDimensions.width, demoMapDimensions.height, previewPalette.canvas)
  fillRect(pixels, 48, 48, 864, 864, previewPalette.floor)

  for (let position = 144; position < 864; position += 96) {
    fillRect(pixels, position, 72, 1, 816, previewPalette.grid)
    fillRect(pixels, 72, position, 816, 1, previewPalette.grid)
  }

  fillRect(pixels, 48, 48, 864, 6, previewPalette.wall)
  fillRect(pixels, 48, 906, 864, 6, previewPalette.wall)
  fillRect(pixels, 48, 48, 6, 864, previewPalette.wall)
  fillRect(pixels, 906, 48, 6, 864, previewPalette.wall)
  fillRect(pixels, 72, 202, 816, 10, previewPalette.corridor)
  fillRect(pixels, 72, 748, 816, 10, previewPalette.corridor)
  fillRect(pixels, 202, 72, 10, 816, previewPalette.corridor)
  fillRect(pixels, 748, 72, 10, 816, previewPalette.corridor)

  for (const [x, y] of [[364, 364], [514, 364], [364, 514], [514, 514]]) {
    fillRect(pixels, x + 8, y + 8, 92, 92, previewPalette.columnShadow)
    fillRect(pixels, x, y, 92, 92, previewPalette.column)
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(demoMapDimensions.width, 0)
  header.writeUInt32BE(demoMapDimensions.height, 4)
  header[8] = 8
  header[9] = 6
  header[10] = 0
  header[11] = 0
  header[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(pixels, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function buildDemoPcd() {
  const points: Array<[number, number, number]> = []
  const addPoint = (x: number, y: number) => points.push([
    demoRegistration.origin.x + x * demoRegistration.resolution,
    demoRegistration.origin.y + (demoMapDimensions.height - y) * demoRegistration.resolution,
    0,
  ])
  const addEdge = (x1: number, y1: number, x2: number, y2: number) => {
    const steps = Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 16)
    for (let index = 0; index <= steps; index += 1) {
      const progress = index / steps
      addPoint(x1 + (x2 - x1) * progress, y1 + (y2 - y1) * progress)
    }
  }
  const addRectangle = (x: number, y: number, width: number, height: number) => {
    addEdge(x, y, x + width, y)
    addEdge(x + width, y, x + width, y + height)
    addEdge(x + width, y + height, x, y + height)
    addEdge(x, y + height, x, y)
  }

  addRectangle(48, 48, 864, 864)
  for (const [x, y] of [[364, 364], [514, 364], [364, 514], [514, 514]]) addRectangle(x, y, 92, 92)

  return Buffer.from([
    '# .PCD v0.7 - Point Cloud Data file format',
    'VERSION .7',
    'FIELDS x y z',
    'SIZE 4 4 4',
    'TYPE F F F',
    'COUNT 1 1 1',
    `WIDTH ${points.length}`,
    'HEIGHT 1',
    'VIEWPOINT 0 0 0 1 0 0 0',
    `POINTS ${points.length}`,
    'DATA ascii',
    ...points.map(([x, y, z]) => `${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`),
    '',
  ].join('\n'), 'utf8')
}

export const demoPreview = buildDemoPreview()
export const demoPcd = buildDemoPcd()
