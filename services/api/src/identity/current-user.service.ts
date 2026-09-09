import { Injectable, NotFoundException } from '@nestjs/common'
import { Inject } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'

const defaultDemoUserEmail = 'guide@booster.tech'

export interface CurrentUser {
  id: string
  email: string
  displayName: string | null
}

@Injectable()
export class CurrentUserService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getCurrentUser(): Promise<CurrentUser> {
    const email = process.env.DEMO_USER_EMAIL ?? defaultDemoUserEmail
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, displayName: true },
    })

    if (!user) {
      throw new NotFoundException('当前用户不存在')
    }

    return user
  }
}
