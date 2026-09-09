import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'

const demoUserEmail = 'guide@booster.tech'

@Injectable()
export class TourTasksService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listForDemoUser() {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { email: demoUserEmail },
      select: { id: true },
    })

    const tasks = await this.prisma.tourTask.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        map: { select: { name: true } },
        _count: { select: { points: true } },
      },
    })

    return tasks.map((task) => ({
      id: task.id,
      name: task.name,
      mapName: task.map.name,
      pointCount: task._count.points,
      status: task.status,
      version: task.version,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    }))
  }
}
