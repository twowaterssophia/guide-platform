import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { Persona, PersonaCustomSkill, Prisma } from '@prisma/client'
import type { PersonaDetail, PersonaListPage, PersonaSummary, SkillList } from '@guide/contracts'
import { PrismaService } from '../database/prisma.service'
import { CurrentUserService } from '../identity/current-user.service'
import { SKILL_CATALOG_PROVIDER } from '../skills/skill-catalog.provider'
import type { SkillCatalogProvider } from '../skills/skill-catalog.provider'
import type { ListPersonasQuery, PersonaCustomSkillInputDto, PersonaUpdateDto, PersonaWriteDto } from './persona.dto'

type PersonaWithSkills = Persona & { customSkills: PersonaCustomSkill[] }

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

function toDetail(persona: PersonaWithSkills): PersonaDetail {
  return {
    ...toSummary(persona),
    prompt: persona.prompt,
    presetSkillsEnabled: persona.presetSkillsEnabled,
    customSkills: persona.customSkills.map((skill) => ({
      id: skill.id,
      skillId: skill.skillId,
      skillName: skill.skillName,
      source: skill.source === 'OFFICIAL' ? 'official' : 'cloud',
      instruction: skill.instruction,
      example: skill.example,
      sequence: skill.sequence,
    })),
  }
}

export async function resolveCustomSkillCreates(
  inputs: PersonaCustomSkillInputDto[],
  catalog: SkillCatalogProvider,
): Promise<Prisma.PersonaCustomSkillCreateWithoutPersonaInput[]> {
  const duplicateIds = inputs.filter((item, index) => inputs.findIndex((candidate) => candidate.skillId === item.skillId) !== index)
  if (duplicateIds.length > 0) {
    throw new BadRequestException({ code: 'DUPLICATE_SKILL', message: '不能重复添加同一技能' })
  }

  const availableSkills: SkillList = await catalog.list({ compatible: true })
  const skillsById = new Map(availableSkills.map((skill) => [skill.id, skill]))

  return inputs.map((input, sequence) => {
    const skill = skillsById.get(input.skillId)
    if (!skill) {
      throw new BadRequestException({ code: 'SKILL_UNAVAILABLE', message: `技能 ${input.skillId} 不可用或不兼容` })
    }
    return {
      skillId: skill.id,
      skillName: skill.name,
      source: skill.source === 'official' ? 'OFFICIAL' : 'CLOUD',
      instruction: input.instruction.trim(),
      example: input.example.trim(),
      sequence,
    }
  })
}

@Injectable()
export class PersonasService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CurrentUserService) private readonly currentUser: CurrentUserService,
    @Inject(SKILL_CATALOG_PROVIDER) private readonly catalog: SkillCatalogProvider,
  ) {}

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
    return {
      items: items.map(toSummary),
      nextCursor: hasNextPage ? items.at(-1)?.id : undefined,
    }
  }

  async get(personaId: string): Promise<PersonaDetail> {
    const user = await this.currentUser.getCurrentUser()
    const persona = await this.prisma.persona.findFirst({
      where: { id: personaId, OR: [{ ownerId: user.id }, { isSystemDefault: true }] },
      include: { customSkills: { orderBy: { sequence: 'asc' } } },
    })
    if (!persona) throw new NotFoundException('人设不存在')
    return toDetail(persona)
  }

  async create(input: PersonaWriteDto): Promise<PersonaDetail> {
    const [user, customSkills] = await Promise.all([
      this.currentUser.getCurrentUser(),
      resolveCustomSkillCreates(input.customSkills, this.catalog),
    ])
    const persona = await this.prisma.persona.create({
      data: {
        ownerId: user.id,
        name: input.name.trim(),
        voice: input.voice.trim(),
        prompt: input.prompt.trim(),
        presetSkillsEnabled: input.presetSkillsEnabled,
        customSkills: { create: customSkills },
      },
      include: { customSkills: { orderBy: { sequence: 'asc' } } },
    })
    return toDetail(persona)
  }

  async update(personaId: string, input: PersonaUpdateDto): Promise<PersonaDetail> {
    const [user, customSkills] = await Promise.all([
      this.currentUser.getCurrentUser(),
      resolveCustomSkillCreates(input.customSkills, this.catalog),
    ])
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
      await transaction.personaCustomSkill.deleteMany({ where: { personaId } })
      await transaction.personaCustomSkill.createMany({
        data: customSkills.map((skill) => ({ ...skill, personaId })),
      })
      const persona = await transaction.persona.findUniqueOrThrow({
        where: { id: personaId },
        include: { customSkills: { orderBy: { sequence: 'asc' } } },
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
      const defaultPersona = await transaction.persona.findFirst({
        where: { isSystemDefault: true },
        select: { id: true },
      })
      if (!defaultPersona) {
        throw new ConflictException({ code: 'SYSTEM_PERSONA_MISSING', message: '系统默认人设不可用' })
      }
      await transaction.tourTask.updateMany({
        where: { personaId },
        data: { personaId: defaultPersona.id },
      })
      await transaction.persona.delete({ where: { id: personaId } })
    })
  }
}
