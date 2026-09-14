import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { Persona } from '@prisma/client'
import type { PersonaDetail, PersonaListPage, PersonaSummary } from '@guide/contracts'
import { PrismaService } from '../database/prisma.service'
import { CurrentUserService } from '../identity/current-user.service'
import type { ListPersonasQuery, PersonaUpdateDto, PersonaWriteDto } from './persona.dto'

type PersonaWithPlugins = Persona & {
  pluginLinks: Array<{ pluginId: string; plugin: { name: string } }>
}

function toSummary(persona: Persona): PersonaSummary {
  return {
    id: persona.id,
    name: persona.name,
    voice: persona.voice,
    isSystemDefault: persona.isSystemDefault,
    version: persona.version,
    createdAt: persona.createdAt.toISOString(),
    updatedAt: persona.updatedAt.toISOString(),
  }
}

function toDetail(persona: PersonaWithPlugins): PersonaDetail {
  return {
    ...toSummary(persona),
    prompt: persona.prompt,
    presetSkillsEnabled: persona.presetSkillsEnabled,
    pluginIds: persona.pluginLinks.map((link) => link.pluginId),
    plugins: persona.pluginLinks.map((link) => ({ id: link.pluginId, name: link.plugin.name })),
  }
}

@Injectable()
export class PersonasService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CurrentUserService) private readonly currentUser: CurrentUserService,
  ) {}

  private async validatePluginIds(pluginIds: string[], ownerId: string) {
    const uniqueIds = [...new Set(pluginIds)]
    if (uniqueIds.length !== pluginIds.length) throw new BadRequestException({ code: 'DUPLICATE_PLUGIN', message: '不能重复选择同一插件' })
    if (uniqueIds.length === 0) return uniqueIds
    const count = await this.prisma.mcpPlugin.count({ where: { ownerId, id: { in: uniqueIds } } })
    if (count !== uniqueIds.length) throw new BadRequestException({ code: 'PLUGIN_UNAVAILABLE', message: '所选插件不存在或不可用' })
    return uniqueIds
  }

  async list(query: ListPersonasQuery): Promise<PersonaListPage> {
    const user = await this.currentUser.getCurrentUser()
    const personas = await this.prisma.persona.findMany({
      where: { OR: [{ ownerId: user.id }, { isSystemDefault: true }] },
      orderBy: [{ isSystemDefault: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
      cursor: query.cursor ? { id: query.cursor } : undefined,
      skip: query.cursor ? 1 : 0,
      take: query.limit + 1,
    })
    const hasNextPage = personas.length > query.limit
    const items = hasNextPage ? personas.slice(0, query.limit) : personas
    return { items: items.map(toSummary), nextCursor: hasNextPage ? items.at(-1)?.id : undefined }
  }

  async get(personaId: string): Promise<PersonaDetail> {
    const user = await this.currentUser.getCurrentUser()
    const persona = await this.prisma.persona.findFirst({
      where: { id: personaId, OR: [{ ownerId: user.id }, { isSystemDefault: true }] },
      include: { pluginLinks: { include: { plugin: { select: { name: true } } } } },
    })
    if (!persona) throw new NotFoundException('人设不存在')
    return toDetail(persona)
  }

  async create(input: PersonaWriteDto): Promise<PersonaDetail> {
    const user = await this.currentUser.getCurrentUser()
    const pluginIds = await this.validatePluginIds(input.pluginIds ?? [], user.id)
    const persona = await this.prisma.persona.create({
      data: {
        ownerId: user.id,
        name: input.name.trim(),
        voice: input.voice.trim(),
        prompt: input.prompt.trim(),
        presetSkillsEnabled: input.presetSkillsEnabled,
        pluginLinks: { create: pluginIds.map((pluginId) => ({ pluginId })) },
      },
      include: { pluginLinks: { include: { plugin: { select: { name: true } } } } },
    })
    return toDetail(persona)
  }

  async update(personaId: string, input: PersonaUpdateDto): Promise<PersonaDetail> {
    const user = await this.currentUser.getCurrentUser()
    const pluginIds = await this.validatePluginIds(input.pluginIds ?? [], user.id)
    const existing = await this.prisma.persona.findFirst({
      where: { id: personaId, OR: [{ ownerId: user.id }, { isSystemDefault: true }] },
      select: { ownerId: true, isSystemDefault: true },
    })
    if (!existing) throw new NotFoundException('人设不存在')
    if (existing.isSystemDefault || existing.ownerId !== user.id) {
      throw new ForbiddenException({ code: 'SYSTEM_PERSONA_READ_ONLY', message: '系统默认人设不可编辑' })
    }

    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.persona.updateMany({
        where: { id: personaId, ownerId: user.id, version: input.expectedVersion },
        data: {
          name: input.name.trim(),
          voice: input.voice.trim(),
          prompt: input.prompt.trim(),
          presetSkillsEnabled: input.presetSkillsEnabled,
          version: { increment: 1 },
        },
      })
      if (updated.count === 0) {
        throw new ConflictException({ code: 'VERSION_CONFLICT', message: '人设已被其他会话修改，请刷新后重试' })
      }
      await transaction.personaPlugin.deleteMany({ where: { personaId } })
      if (pluginIds.length > 0) {
        await transaction.personaPlugin.createMany({ data: pluginIds.map((pluginId) => ({ personaId, pluginId })) })
      }
      const persona = await transaction.persona.findUniqueOrThrow({
        where: { id: personaId },
        include: { pluginLinks: { include: { plugin: { select: { name: true } } } } },
      })
      return toDetail(persona)
    })
  }

  async delete(personaId: string): Promise<void> {
    const user = await this.currentUser.getCurrentUser()
    const existing = await this.prisma.persona.findFirst({
      where: { id: personaId, OR: [{ ownerId: user.id }, { isSystemDefault: true }] },
      select: { ownerId: true, isSystemDefault: true },
    })
    if (!existing) throw new NotFoundException('人设不存在')
    if (existing.isSystemDefault || existing.ownerId !== user.id) {
      throw new ForbiddenException({ code: 'SYSTEM_PERSONA_PROTECTED', message: '系统默认人设不可删除' })
    }
    await this.prisma.$transaction(async (transaction) => {
      const defaultPersona = await transaction.persona.findFirst({ where: { isSystemDefault: true }, select: { id: true } })
      if (!defaultPersona) throw new ConflictException({ code: 'SYSTEM_PERSONA_MISSING', message: '系统默认人设不可用' })
      await transaction.tourTask.updateMany({ where: { personaId }, data: { personaId: defaultPersona.id } })
      await transaction.persona.delete({ where: { id: personaId } })
    })
  }
}
