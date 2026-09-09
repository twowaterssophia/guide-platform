import { PrismaClient, TourTaskStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'guide@booster.tech' },
    update: {},
    create: {
      externalId: 'demo-guide-user',
      email: 'guide@booster.tech',
      displayName: '导览演示账号',
    },
  })

  const map = await prisma.mapAsset.upsert({
    where: { id: 'demo-wangfujing-map' },
    update: {},
    create: {
      id: 'demo-wangfujing-map',
      ownerId: user.id,
      name: '王府井站站厅',
      storageKey: 'demo/maps/wangfujing-station-hall.map',
      originalFileName: 'wangfujing-station-hall.map',
      mediaType: 'application/octet-stream',
      sizeBytes: 2_400_000,
    },
  })

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
