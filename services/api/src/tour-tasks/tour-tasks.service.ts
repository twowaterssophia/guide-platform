import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma, TaskAction as PrismaTaskAction, TourPath, TourPoint, TourTask } from '@prisma/client'
import { tourTaskUpdateInputSchema, tourTaskWriteInputSchema } from '@guide/contracts'
import type {
  PathTaskAction,
  PointTaskActionWrite,
  TaskAction,
  TourPath as ContractTourPath,
  TourPoint as ContractTourPoint,
  TourTaskDetail,
  TourTaskList,
  TourTaskSummary,
  TourTaskUpdateInput,
  TourTaskWriteInput,
} from '@guide/contracts'
import { PrismaService } from '../database/prisma.service'
import { CurrentUserService } from '../identity/current-user.service'
import { SKILL_CATALOG_PROVIDER } from '../skills/skill-catalog.provider'
import type { SkillCatalogProvider } from '../skills/skill-catalog.provider'

type StoredAction = PrismaTaskAction
type TaskWithRelations = TourTask & {
  map: { id: string; name: string }
  persona: { id: string; name: string; isSystemDefault: boolean } | null
  points: Array<TourPoint & { actions: StoredAction[] }>
  paths: Array<TourPath & { actions: StoredAction[] }>
}

function validationMessage(issues: Array<{ path: PropertyKey[]; message: string }>) {
  return issues.map((issue) => `${issue.path.join('.') || 'body'}：${issue.message}`).join('；')
}

function parseWriteInput(input: unknown, update: boolean): TourTaskWriteInput | TourTaskUpdateInput {
  const result = update ? tourTaskUpdateInputSchema.safeParse(input) : tourTaskWriteInputSchema.safeParse(input)
  if (!result.success) {
    throw new BadRequestException({ code: 'VALIDATION_ERROR', message: validationMessage(result.error.issues) })
  }
  return result.data
}

function toTaskAction(action: StoredAction): TaskAction {
  if (action.type === 'SPEECH') {
    return { id: action.id, sequence: action.sequence, type: 'SPEECH', narration: action.narration ?? '' }
  }
  if (action.type === 'SKILL') {
    return { id: action.id, sequence: action.sequence, type: 'SKILL', skillId: action.skillId ?? '', skillName: action.skillName ?? '' }
  }
  return { id: action.id, sequence: action.sequence, type: 'INTERACTION', interactionPrompt: action.interactionPrompt }
}

function toPathTaskAction(action: StoredAction): PathTaskAction {
  if (action.type === 'SPEECH') {
    return { id: action.id, sequence: action.sequence, type: 'SPEECH', narration: action.narration ?? '' }
  }
  return { id: action.id, sequence: action.sequence, type: 'INTERACTION', interactionPrompt: action.interactionPrompt }
}

function toPoint(point: TaskWithRelations['points'][number]): ContractTourPoint {
  return {
    id: point.id,
    sequence: point.sequence,
    name: point.name,
    x: point.x,
    y: point.y,
    angle: point.angle,
    actions: [...point.actions].sort((left, right) => left.sequence - right.sequence).map(toTaskAction),
  }
}

function toPath(path: TaskWithRelations['paths'][number]): ContractTourPath {
  return {
    id: path.id,
    sequence: path.sequence,
    fromPointId: path.fromPointId,
    toPointId: path.toPointId,
    actions: [...path.actions].sort((left, right) => left.sequence - right.sequence).map(toPathTaskAction),
  }
}

function toDetail(task: TaskWithRelations): TourTaskDetail {
  return {
    id: task.id,
    name: task.name,
    map: task.map,
    persona: task.persona,
    version: task.version,
    points: [...task.points].sort((left, right) => left.sequence - right.sequence).map(toPoint),
    paths: [...task.paths].sort((left, right) => left.sequence - right.sequence).map(toPath),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }
}

type ActionWrite = PointTaskActionWrite & { sequence: number }

function actionData(action: ActionWrite, skillNames: Map<string, string>, relation: { pointId?: string; pathId?: string }): Prisma.TaskActionCreateManyInput {
  const base = { sequence: action.sequence, ...relation }
  if (action.type === 'SPEECH') return { ...base, type: 'SPEECH', narration: action.narration }
  if (action.type === 'SKILL') return { ...base, type: 'SKILL', skillId: action.skillId, skillName: skillNames.get(action.skillId) }
  return { ...base, type: 'INTERACTION', interactionPrompt: action.interactionPrompt?.trim() || null }
}

@Injectable()
export class TourTasksService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CurrentUserService) private readonly currentUser: CurrentUserService,
    @Inject(SKILL_CATALOG_PROVIDER) private readonly catalog: SkillCatalogProvider,
  ) {}

  private async getOwnedMapAndPersona(mapId: string, personaId: string | null, ownerId: string) {
    const [map, persona] = await Promise.all([
      this.prisma.mapAsset.findFirst({ where: { id: mapId, ownerId }, select: { id: true } }),
      personaId
        ? this.prisma.persona.findFirst({ where: { id: personaId, OR: [{ ownerId }, { isSystemDefault: true }] }, select: { id: true } })
        : Promise.resolve(null),
    ])
    if (!map) throw new NotFoundException('地图不存在')
    if (personaId && !persona) throw new NotFoundException('人设不存在')
  }

  private async resolveSkillNames(input: TourTaskWriteInput) {
    const skillIds = input.points.flatMap((point) => point.actions)
      .filter((action): action is Extract<PointTaskActionWrite, { type: 'SKILL' }> => action.type === 'SKILL')
      .map((action) => action.skillId)
    if (skillIds.length === 0) return new Map<string, string>()
    const skills = await this.catalog.list({ compatible: true })
    const skillNames = new Map(skills.map((skill) => [skill.id, skill.name]))
    const unavailable = skillIds.find((skillId) => !skillNames.has(skillId))
    if (unavailable) throw new BadRequestException({ code: 'SKILL_UNAVAILABLE', message: `技能 ${unavailable} 不可用或不兼容` })
    return skillNames
  }

  private async resolvePersonaId(input: TourTaskWriteInput) {
    if (input.personaId) return input.personaId
    const defaultPersona = await this.prisma.persona.findFirst({ where: { isSystemDefault: true }, select: { id: true } })
    if (!defaultPersona) throw new ConflictException({ code: 'SYSTEM_PERSONA_MISSING', message: '系统默认人设不可用' })
    return defaultPersona.id
  }

  private async loadDetail(taskId: string, ownerId: string, transaction: Prisma.TransactionClient | PrismaService = this.prisma) {
    const task = await transaction.tourTask.findFirst({
      where: { id: taskId, ownerId },
      include: {
        map: { select: { id: true, name: true } },
        persona: { select: { id: true, name: true, isSystemDefault: true } },
        points: { include: { actions: true }, orderBy: { sequence: 'asc' } },
        paths: { include: { actions: true }, orderBy: { sequence: 'asc' } },
      },
    })
    if (!task) throw new NotFoundException('导览任务不存在')
    return toDetail(task as TaskWithRelations)
  }

  async listForCurrentUser(): Promise<TourTaskList> {
    const user = await this.currentUser.getCurrentUser()
    const tasks = await this.prisma.tourTask.findMany({
      where: { ownerId: user.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        map: { select: { name: true } },
        _count: { select: { points: true } },
      },
    })
    return tasks.map((task): TourTaskSummary => ({
      id: task.id,
      name: task.name,
      mapName: task.map.name,
      pointCount: task._count.points,
      version: task.version,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    }))
  }

  async get(taskId: string): Promise<TourTaskDetail> {
    const user = await this.currentUser.getCurrentUser()
    return this.loadDetail(taskId, user.id)
  }

  private async writeStructure(transaction: Prisma.TransactionClient, taskId: string, input: TourTaskWriteInput, skillNames: Map<string, string>) {
    const pointIds = new Map<string, string>()
    for (const [pointIndex, point] of input.points.entries()) {
      const created = await transaction.tourPoint.create({
        data: { taskId, sequence: pointIndex + 1, name: point.name, x: point.x, y: point.y, angle: point.angle },
        select: { id: true },
      })
      pointIds.set(point.key, created.id)
      if (point.actions.length > 0) {
        await transaction.taskAction.createMany({
          data: point.actions.map((action, index) => actionData({ ...action, sequence: index + 1 } as ActionWrite, skillNames, { pointId: created.id })),
        })
      }
    }
    for (const [pathIndex, path] of input.paths.entries()) {
      const fromPointId = pointIds.get(path.fromPointKey)
      const toPointId = pointIds.get(path.toPointKey)
      if (!fromPointId || !toPointId) throw new BadRequestException({ code: 'INVALID_PATH', message: '路径引用了不存在的点位' })
      const created = await transaction.tourPath.create({ data: { taskId, fromPointId, toPointId, sequence: pathIndex + 1 }, select: { id: true } })
      if (path.actions.length > 0) {
        await transaction.taskAction.createMany({
          data: path.actions.map((action, index) => actionData({ ...action, sequence: index + 1 } as ActionWrite, skillNames, { pathId: created.id })),
        })
      }
    }
  }

  async create(input: unknown): Promise<TourTaskDetail> {
    const parsed = parseWriteInput(input, false) as TourTaskWriteInput
    const user = await this.currentUser.getCurrentUser()
    const personaId = await this.resolvePersonaId(parsed)
    await this.getOwnedMapAndPersona(parsed.mapId, personaId, user.id)
    const skillNames = await this.resolveSkillNames(parsed)
    return this.prisma.$transaction(async (transaction) => {
      const task = await transaction.tourTask.create({
        data: { ownerId: user.id, name: parsed.name, mapId: parsed.mapId, personaId, version: 1 },
        select: { id: true },
      })
      await this.writeStructure(transaction, task.id, parsed, skillNames)
      return this.loadDetail(task.id, user.id, transaction)
    })
  }

  async update(taskId: string, input: unknown): Promise<TourTaskDetail> {
    const parsed = parseWriteInput(input, true) as TourTaskUpdateInput
    const user = await this.currentUser.getCurrentUser()
    const personaId = await this.resolvePersonaId(parsed)
    await this.getOwnedMapAndPersona(parsed.mapId, personaId, user.id)
    const skillNames = await this.resolveSkillNames(parsed)
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.tourTask.updateMany({
        where: { id: taskId, ownerId: user.id, version: parsed.expectedVersion },
        data: { name: parsed.name, mapId: parsed.mapId, personaId, version: { increment: 1 } },
      })
      if (updated.count === 0) {
        const existing = await transaction.tourTask.findFirst({ where: { id: taskId, ownerId: user.id }, select: { id: true } })
        if (!existing) throw new NotFoundException('导览任务不存在')
        throw new ConflictException({ code: 'VERSION_CONFLICT', message: '导览任务已被其他会话修改，请刷新后重试' })
      }
      await transaction.tourPath.deleteMany({ where: { taskId } })
      await transaction.tourPoint.deleteMany({ where: { taskId } })
      await this.writeStructure(transaction, taskId, parsed, skillNames)
      return this.loadDetail(taskId, user.id, transaction)
    })
  }

  async delete(taskId: string): Promise<void> {
    const user = await this.currentUser.getCurrentUser()
    const deleted = await this.prisma.tourTask.deleteMany({ where: { id: taskId, ownerId: user.id } })
    if (deleted.count === 0) throw new NotFoundException('导览任务不存在')
  }

}
