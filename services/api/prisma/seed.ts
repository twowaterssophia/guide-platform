import { PrismaClient, TourTaskStatus } from '@prisma/client'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const prisma = new PrismaClient()
const demoUserEmail = process.env.DEMO_USER_EMAIL ?? 'guide@booster.tech'

const demoPcd = Buffer.from(`# .PCD v0.7 - Point Cloud Data file format\nVERSION .7\nFIELDS x y z\nSIZE 4 4 4\nTYPE F F F\nCOUNT 1 1 1\nWIDTH 1\nHEIGHT 1\nVIEWPOINT 0 0 0 1 0 0 0\nPOINTS 1\nDATA ascii\n0 0 0\n`, 'utf8')
const demoPreview = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
const demoRegistration = {
  formatVersion: 1,
  resolution: 0.05,
  origin: { x: 0, y: 0, yaw: 0 },
  width: 1,
  height: 1,
  frameId: 'map',
  imageAxes: { x: 'right', y: 'down' },
  occupiedThreshold: 0.65,
  freeThreshold: 0.2,
  pcdTransform: {
    translation: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
  },
}

async function writeDemoMapBundle() {
  const root = resolve(process.env.MAP_STORAGE_ROOT ?? './storage/maps')
  const directory = resolve(root, 'demo-wangfujing-map')
  await mkdir(directory, { recursive: true })
  await Promise.all([
    writeFile(resolve(directory, 'map.pcd'), demoPcd),
    writeFile(resolve(directory, 'map.png'), demoPreview),
  ])
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: demoUserEmail },
    update: {},
    create: {
      externalId: 'demo-guide-user',
      email: demoUserEmail,
      displayName: '导览演示账号',
    },
  })

  await prisma.persona.upsert({
    where: { id: '__system_default__' },
    update: {},
    create: {
      id: '__system_default__',
      name: '默认',
      voice: 'female',
      isSystemDefault: true,
      presetSkillsEnabled: true,
    },
  })

  const map = await prisma.mapAsset.upsert({
    where: { id: 'demo-wangfujing-map' },
    update: {
      storageKey: 'demo-wangfujing-map/map.pcd',
      originalFileName: 'wangfujing-station-hall.pcd',
      mediaType: 'application/octet-stream',
      sizeBytes: demoPcd.length,
      pcdEncoding: 'ascii',
      previewStorageKey: 'demo-wangfujing-map/map.png',
      previewOriginalFileName: 'wangfujing-station-hall.png',
      previewMediaType: 'image/png',
      previewSizeBytes: demoPreview.length,
      registrationMetadata: demoRegistration,
    },
    create: {
      id: 'demo-wangfujing-map',
      ownerId: user.id,
      name: '王府井站站厅',
      storageKey: 'demo-wangfujing-map/map.pcd',
      originalFileName: 'wangfujing-station-hall.pcd',
      mediaType: 'application/octet-stream',
      sizeBytes: demoPcd.length,
      pcdEncoding: 'ascii',
      previewStorageKey: 'demo-wangfujing-map/map.png',
      previewOriginalFileName: 'wangfujing-station-hall.png',
      previewMediaType: 'image/png',
      previewSizeBytes: demoPreview.length,
      registrationMetadata: demoRegistration,
    },
  })

  await writeDemoMapBundle()

  await prisma.tourTask.upsert({
    where: { id: 'demo-wangfujing-tour' },
    update: {},
    create: {
      id: 'demo-wangfujing-tour',
      ownerId: user.id,
      name: '王府井站站厅巡检',
      mapId: map.id,
      status: TourTaskStatus.PUBLISHED,
      points: {
        create: [
          { sequence: 1, name: '站厅服务台', x: 210, y: 322, angle: 90 },
          { sequence: 2, name: '站厅 PIS 屏', x: 492, y: 220, angle: 0 },
          { sequence: 3, name: '防汛物资存放点', x: 734, y: 330, angle: 270 },
        ],
      },
    },
  })
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    await prisma.$disconnect()
    throw error
  })
