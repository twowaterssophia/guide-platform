import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { mapRegistrationMetadataSchema } from '@guide/contracts'
import { PrismaService } from '../database/prisma.service'
import { CurrentUserService } from '../identity/current-user.service'
import type {
  LegacyMigrationMapBindings,
  LegacyMigrationOptions,
  LegacyMigrationReport,
  LegacyMigrationResult,
} from './legacy-migration.types'

const LEGACY_VERSION = 2
const DEFAULT_PERSONA_ID = '__system_default__'

type LegacyRecord = Record<string, unknown>
type PreparedLegacy = {
  data: LegacyRecord
  version: number | null
  maps: LegacyRecord[]
  plugins: LegacyRecord[]
  personas: LegacyRecord[]
  tasks: LegacyRecord[]
  mapBindings: LegacyMigrationMapBindings
  personaBindings: Map<string, string>
  pluginBindings: Map<string, string>
  report: LegacyMigrationReport
}

function record(value: unknown): LegacyRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as LegacyRecord : null
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function nonEmptyString(value: unknown): string | null {
  const result = stringValue(value)?.trim() ?? ''
  return result ? result : null
}

function arrayValue(value: unknown): LegacyRecord[] {
  return Array.isArray(value) ? value.map(record).filter((item): item is LegacyRecord => item !== null) : []
}

function parseDate(value: unknown): Date | null {
  if (value === undefined || value === null || value === '') return new Date()
  if (typeof value !== 'string') return null
  const result = new Date(value)
  return Number.isNaN(result.getTime()) ? null : result
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  if (typeof value !== 'string') return null
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function hasSecret(value: unknown): boolean {
  const item = record(value)
  if (!item) return false
  return Object.values(item).some((entry) => typeof entry === 'string' && entry.trim().length > 0)
}

function authType(value: unknown): 'NONE' | 'BEARER' | 'API_KEY' | 'BASIC' | null {
  const normalized = nonEmptyString(value)?.toLowerCase()
  if (!normalized || normalized === 'none') return 'NONE'
  if (normalized === 'bearer') return 'BEARER'
  if (normalized === 'api-key' || normalized === 'api_key') return 'API_KEY'
  if (normalized === 'basic') return 'BASIC'
  return null
}

function actionType(value: unknown): 'SPEECH' | 'SKILL' | 'INTERACTION' | null {
  const normalized = nonEmptyString(value)?.toUpperCase()
  return normalized === 'SPEECH' || normalized === 'SKILL' || normalized === 'INTERACTION' ? normalized : null
}

function issue(report: LegacyMigrationReport, code: string, path: string, message: string, level: 'error' | 'warning' = 'error') {
  report.issues.push({ level, code, path, message })
}

function duplicateIds(items: LegacyRecord[], label: string, report: LegacyMigrationReport) {
  const seen = new Set<string>()
  items.forEach((item, index) => {
    const id = nonEmptyString(item.id)
    if (!id) {
      issue(report, 'MISSING_ID', `${label}[${index}].id`, '旧数据记录缺少稳定 ID')
      return
    }
    if (seen.has(id)) issue(report, 'DUPLICATE_ID', `${label}[${index}].id`, `旧数据中重复的 ${label} ID：${id}`)
    seen.add(id)
  })
}

@Injectable()
export class LegacyMigrationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CurrentUserService) private readonly currentUser: CurrentUserService,
  ) {}

  async dryRun(raw: unknown, options: LegacyMigrationOptions = {}): Promise<LegacyMigrationReport> {
    return (await this.prepare(raw, options)).report
  }

  async importLegacy(raw: unknown, options: LegacyMigrationOptions = {}): Promise<LegacyMigrationResult> {
    const prepared = await this.prepare(raw, options)
    if (!prepared.report.ready) {
      throw new BadRequestException({
        code: 'LEGACY_IMPORT_REJECTED',
        message: '旧版数据未通过 dry-run 校验，请先修复报告中的错误',
        details: prepared.report,
      })
    }

    const user = await this.currentUser.getCurrentUser()
    const imported = await this.prisma.$transaction(async (transaction) => {
      let plugins = 0
      let personas = 0
      let tasks = 0
      let points = 0
      let paths = 0
      let actions = 0

      for (const plugin of prepared.plugins) {
        const createdAt = parseDate(plugin.createdAt) ?? new Date()
        const headers = parseJsonObject(plugin.headers)
        const tools = Array.isArray(plugin.tools) ? plugin.tools.filter((item): item is string => typeof item === 'string') : []
        await transaction.mcpPlugin.create({
          data: {
            id: nonEmptyString(plugin.id)!,
            ownerId: user.id,
            name: nonEmptyString(plugin.name)!,
            description: stringValue(plugin.description)?.trim() ?? '',
            examples: stringValue(plugin.examples)?.trim() ?? '',
            serviceUrl: nonEmptyString(plugin.serviceUrl)!,
            authType: authType(plugin.authType)!,
            encryptedConfiguration: null,
            customHeaders: headers as Prisma.InputJsonValue | undefined,
            tools: tools as Prisma.InputJsonValue,
            lastRefreshedAt: parseDate(plugin.refreshedAt),
            createdAt,
            updatedAt: createdAt,
          },
        })
        plugins += 1
      }

      for (const persona of prepared.personas) {
        if (persona.system === true || persona.isSystemDefault === true) continue
        const createdAt = parseDate(persona.createdAt) ?? new Date()
        await transaction.persona.create({
          data: {
            id: nonEmptyString(persona.id)!,
            ownerId: user.id,
            name: nonEmptyString(persona.name)!,
            voice: nonEmptyString(persona.voice)!,
            prompt: stringValue(persona.prompt)?.trim() ?? '',
            isSystemDefault: false,
            presetSkillsEnabled: persona.presetSkillsEnabled !== false,
            version: 1,
            createdAt,
            updatedAt: createdAt,
          },
        })
        personas += 1
      }

      for (const persona of prepared.personas) {
        if (persona.system === true || persona.isSystemDefault === true) continue
        const personaId = prepared.personaBindings.get(nonEmptyString(persona.id)!)
        if (!personaId) continue
        const pluginIds = Array.isArray(persona.pluginIds) ? persona.pluginIds : []
        for (const pluginIdValue of pluginIds) {
          const pluginId = nonEmptyString(pluginIdValue)
          if (!pluginId) continue
          const resolvedPluginId = prepared.pluginBindings.get(pluginId) ?? pluginId
          await transaction.personaPlugin.create({ data: { personaId, pluginId: resolvedPluginId } })
        }
      }

      for (const task of prepared.tasks) {
        const taskId = nonEmptyString(task.id)!
        const createdAt = parseDate(task.createdAt) ?? new Date()
        const mapId = prepared.mapBindings[nonEmptyString(task.mapId)!]
        const sourcePersonaId = nonEmptyString(task.voicePersonaId ?? task.personaId)
        const personaId = sourcePersonaId ? prepared.personaBindings.get(sourcePersonaId) ?? null : DEFAULT_PERSONA_ID
        await transaction.tourTask.create({
          data: {
            id: taskId,
            ownerId: user.id,
            name: nonEmptyString(task.name)!,
            mapId,
            personaId,
            status: 'DRAFT',
            version: 1,
            createdAt,
            updatedAt: createdAt,
          },
        })

        const sourcePoints = arrayValue(task.points)
        for (const [sequence, point] of sourcePoints.entries()) {
          const pointId = nonEmptyString(point.id)!
          await transaction.tourPoint.create({
            data: {
              id: pointId,
              taskId,
              sequence: sequence + 1,
              name: nonEmptyString(point.name)!,
              x: Number(point.x),
              y: Number(point.y),
              angle: Number(point.angle),
            },
          })
          for (const [actionSequence, action] of arrayValue(point.actions).entries()) {
            await transaction.taskAction.create({
              data: this.actionCreateData(action, actionSequence + 1, { pointId }),
            })
            actions += 1
          }
          points += 1
        }

        for (const [sequence, path] of arrayValue(task.paths).entries()) {
          const pathId = nonEmptyString(path.id)!
          const fromPointId = nonEmptyString(path.fromPointId ?? path.fromPointKey)!
          const toPointId = nonEmptyString(path.toPointId ?? path.toPointKey)!
          await transaction.tourPath.create({
            data: { id: pathId, taskId, fromPointId, toPointId, sequence: sequence + 1 },
          })
          for (const [actionSequence, action] of arrayValue(path.actions).entries()) {
            await transaction.taskAction.create({
              data: this.actionCreateData(action, actionSequence + 1, { pathId }),
            })
            actions += 1
          }
          paths += 1
        }
        tasks += 1
      }

      return { plugins, personas, tasks, points, paths, actions }
    })

    return { imported, mapBindings: prepared.mapBindings }
  }

  private actionCreateData(action: LegacyRecord, sequence: number, owner: { pointId?: string; pathId?: string }): Prisma.TaskActionUncheckedCreateInput {
    const type = actionType(action.type)!
    return {
      id: nonEmptyString(action.id)!,
      sequence,
      type,
      narration: type === 'SPEECH' ? stringValue(action.narration)?.trim() ?? null : null,
      skillId: type === 'SKILL' ? nonEmptyString(action.skillId) : null,
      skillName: type === 'SKILL' ? nonEmptyString(action.skillName) : null,
      interactionPrompt: type === 'INTERACTION' ? stringValue(action.prompt ?? action.interactionPrompt)?.trim() ?? null : null,
      ...owner,
    }
  }

  private async prepare(raw: unknown, options: LegacyMigrationOptions): Promise<PreparedLegacy> {
    const report: LegacyMigrationReport = {
      ready: false,
      sourceVersion: null,
      issues: [],
      summary: {
        mapsInSource: 0,
        mapsBound: 0,
        pluginsToCreate: 0,
        personasToCreate: 0,
        personasReused: 0,
        tasksToCreate: 0,
        pointsToCreate: 0,
        pathsToCreate: 0,
        actionsToCreate: 0,
      },
      mapBindings: {},
    }

    const root = record(raw)
    const wrappedData = root ? record(root.data) : null
    const data = wrappedData ?? root
    const versionValue = root?.version
    const version = typeof versionValue === 'number' ? versionValue : wrappedData ? null : LEGACY_VERSION
    report.sourceVersion = version
    if (!data) {
      issue(report, 'INVALID_JSON_SHAPE', '$', '迁移文件必须是 JSON 对象')
      return this.emptyPrepared(report, {})
    }
    if (version !== LEGACY_VERSION) issue(report, 'UNSUPPORTED_VERSION', 'version', `仅支持 guide.appData version ${LEGACY_VERSION}`)

    const maps = arrayValue(data.maps)
    const plugins = arrayValue(data.mcpPlugins)
    const personas = arrayValue(data.personas)
    const tasks = arrayValue(data.tourTasks)
    report.summary.mapsInSource = maps.length
    duplicateIds(maps, 'maps', report)
    duplicateIds(plugins, 'mcpPlugins', report)
    duplicateIds(personas, 'personas', report)
    duplicateIds(tasks, 'tourTasks', report)

    const user = await this.currentUser.getCurrentUser()
    const [existingMaps, existingPlugins, existingPersonas, existingTasks, existingPoints, existingPaths, existingActions, defaultPersona] = await Promise.all([
      this.prisma.mapAsset.findMany({ where: { ownerId: user.id }, select: { id: true, name: true, storageKey: true, previewStorageKey: true, registrationMetadata: true } }),
      this.prisma.mcpPlugin.findMany({ where: { ownerId: user.id }, select: { id: true } }),
      this.prisma.persona.findMany({ where: { OR: [{ ownerId: user.id }, { isSystemDefault: true }] }, select: { id: true, isSystemDefault: true } }),
      this.prisma.tourTask.findMany({ where: { ownerId: user.id }, select: { id: true } }),
      this.prisma.tourPoint.findMany({ where: { task: { ownerId: user.id } }, select: { id: true } }),
      this.prisma.tourPath.findMany({ where: { task: { ownerId: user.id } }, select: { id: true } }),
      this.prisma.taskAction.findMany({ where: { OR: [{ point: { task: { ownerId: user.id } } }, { path: { task: { ownerId: user.id } } }] }, select: { id: true } }),
      this.prisma.persona.findFirst({ where: { isSystemDefault: true }, select: { id: true } }),
    ])
    const existingMapById = new Map(existingMaps.map((map) => [map.id, map]))
    const existingPluginIds = new Set(existingPlugins.map((item) => item.id))
    const existingPersonaIds = new Set(existingPersonas.map((item) => item.id))
    const existingTaskIds = new Set(existingTasks.map((item) => item.id))
    const existingPointIds = new Set(existingPoints.map((item) => item.id))
    const existingPathIds = new Set(existingPaths.map((item) => item.id))
    const existingActionIds = new Set(existingActions.map((item) => item.id))
    const mapBindings: LegacyMigrationMapBindings = { ...(options.mapBindings ?? {}) }
    const personaBindings = new Map<string, string>()
    const pluginBindings = new Map<string, string>()

    if (!defaultPersona) issue(report, 'SYSTEM_PERSONA_MISSING', 'personas', '数据库中不存在系统默认人设')
    for (const persona of personas) {
      const id = nonEmptyString(persona.id)
      if (!id) continue
      if (persona.system === true || persona.isSystemDefault === true) {
        if (defaultPersona) personaBindings.set(id, defaultPersona.id)
        report.summary.personasReused += 1
      } else {
        personaBindings.set(id, id)
        report.summary.personasToCreate += 1
        if (existingPersonaIds.has(id)) issue(report, 'ID_CONFLICT', `personas[${personas.indexOf(persona)}].id`, `人设 ID 已存在：${id}`)
      }
    }

    for (const plugin of plugins) {
      const id = nonEmptyString(plugin.id)
      if (!id) continue
      pluginBindings.set(id, id)
      report.summary.pluginsToCreate += 1
      if (existingPluginIds.has(id)) issue(report, 'ID_CONFLICT', `mcpPlugins[${plugins.indexOf(plugin)}].id`, `插件 ID 已存在：${id}`)
      const url = nonEmptyString(plugin.serviceUrl)
      if (!url) issue(report, 'INVALID_URL', `mcpPlugins[${plugins.indexOf(plugin)}].serviceUrl`, 'MCP 服务地址不能为空')
      else {
        try {
          const parsed = new URL(url)
          if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol')
        } catch {
          issue(report, 'INVALID_URL', `mcpPlugins[${plugins.indexOf(plugin)}].serviceUrl`, 'MCP 服务地址必须是 http/https URL')
        }
      }
      const parsedAuthType = authType(plugin.authType)
      if (!parsedAuthType) issue(report, 'INVALID_AUTH_TYPE', `mcpPlugins[${plugins.indexOf(plugin)}].authType`, '不支持的插件认证方式')
      if (hasSecret(plugin.auth)) issue(report, 'PLUGIN_SECRET_REQUIRES_ENCRYPTION', `mcpPlugins[${plugins.indexOf(plugin)}].auth`, '旧版认证密钥不能在未配置加密 Provider 时导入')
      if (plugin.headers !== undefined && plugin.headers !== '' && !parseJsonObject(plugin.headers)) issue(report, 'INVALID_HEADERS', `mcpPlugins[${plugins.indexOf(plugin)}].headers`, '请求头必须是有效 JSON 对象')
      if (plugin.tools !== undefined && (!Array.isArray(plugin.tools) || plugin.tools.some((item) => typeof item !== 'string'))) issue(report, 'INVALID_TOOLS', `mcpPlugins[${plugins.indexOf(plugin)}].tools`, '工具列表必须是字符串数组')
      if (!parseDate(plugin.createdAt)) issue(report, 'INVALID_DATE', `mcpPlugins[${plugins.indexOf(plugin)}].createdAt`, '创建时间不是有效日期')
    }

    for (const map of maps) {
      const id = nonEmptyString(map.id)
      if (!id) continue
      const targetId = mapBindings[id] ?? (existingMapById.has(id) ? id : undefined)
      if (!targetId) {
        issue(report, 'MAP_FILE_REQUIRED', `maps[${maps.indexOf(map)}]`, `地图“${nonEmptyString(map.name) ?? id}”缺少可迁移文件，请先在新版上传并通过 mapBindings 绑定`)
        continue
      }
      const target = existingMapById.get(targetId)
      if (!target) {
        issue(report, 'MAP_BINDING_NOT_FOUND', `mapBindings.${id}`, `绑定的新版地图不存在或不属于当前用户：${targetId}`)
        continue
      }
      if (!target.storageKey || !target.previewStorageKey || !mapRegistrationMetadataSchema.safeParse(target.registrationMetadata).success) {
        issue(report, 'MAP_NOT_READY', `mapBindings.${id}`, `绑定的新版地图尚未完成 PCD、PNG 和配准数据上传：${targetId}`)
        continue
      }
      mapBindings[id] = targetId
      report.summary.mapsBound += 1
    }

    const pluginIds = new Set(plugins.map((plugin) => nonEmptyString(plugin.id)).filter((id): id is string => Boolean(id)))
    const sourcePointIds = new Set<string>()
    const sourcePathIds = new Set<string>()
    const sourceActionIds = new Set<string>()
    for (const persona of personas) {
      const personaIndex = personas.indexOf(persona)
      if (!nonEmptyString(persona.name)) issue(report, 'INVALID_PERSONA', `personas[${personaIndex}].name`, '人设名称不能为空')
      if (!nonEmptyString(persona.voice)) issue(report, 'INVALID_PERSONA', `personas[${personaIndex}].voice`, '人设音色不能为空')
      for (const [pluginIndex, pluginIdValue] of (Array.isArray(persona.pluginIds) ? persona.pluginIds : []).entries()) {
        const pluginId = nonEmptyString(pluginIdValue)
        if (!pluginId || (!pluginIds.has(pluginId) && !existingPluginIds.has(pluginId))) issue(report, 'MISSING_PLUGIN_REFERENCE', `personas[${personaIndex}].pluginIds[${pluginIndex}]`, `人设引用了不存在的插件：${pluginIdValue}`)
      }
      if (!parseDate(persona.createdAt)) issue(report, 'INVALID_DATE', `personas[${personaIndex}].createdAt`, '创建时间不是有效日期')
    }

    for (const task of tasks) {
      const taskIndex = tasks.indexOf(task)
      const taskId = nonEmptyString(task.id)
      if (taskId && existingTaskIds.has(taskId)) issue(report, 'ID_CONFLICT', `tourTasks[${taskIndex}].id`, `导览任务 ID 已存在：${taskId}`)
      if (!nonEmptyString(task.name)) issue(report, 'INVALID_TASK', `tourTasks[${taskIndex}].name`, '导览任务名称不能为空')
      const legacyMapId = nonEmptyString(task.mapId)
      if (!legacyMapId || !mapBindings[legacyMapId]) issue(report, 'MISSING_MAP_REFERENCE', `tourTasks[${taskIndex}].mapId`, `导览任务引用了未绑定的旧地图：${legacyMapId ?? '(空)'}`)
      const sourcePersonaId = nonEmptyString(task.voicePersonaId ?? task.personaId)
      if (sourcePersonaId && !personaBindings.has(sourcePersonaId)) issue(report, 'MISSING_PERSONA_REFERENCE', `tourTasks[${taskIndex}].voicePersonaId`, `导览任务引用了不存在的人设：${sourcePersonaId}`)
      const sourcePoints = arrayValue(task.points)
      const sourcePaths = arrayValue(task.paths)
      report.summary.tasksToCreate += 1
      report.summary.pointsToCreate += sourcePoints.length
      report.summary.pathsToCreate += sourcePaths.length
      const pointIds = new Set<string>()
      sourcePoints.forEach((point, pointIndex) => {
        const pointId = nonEmptyString(point.id)
        if (!pointId) issue(report, 'MISSING_ID', `tourTasks[${taskIndex}].points[${pointIndex}].id`, '点位缺少稳定 ID')
        else if (pointIds.has(pointId)) issue(report, 'DUPLICATE_ID', `tourTasks[${taskIndex}].points[${pointIndex}].id`, `任务内重复点位 ID：${pointId}`)
        else if (existingPointIds.has(pointId)) issue(report, 'ID_CONFLICT', `tourTasks[${taskIndex}].points[${pointIndex}].id`, `点位 ID 已存在：${pointId}`)
        else if (sourcePointIds.has(pointId)) issue(report, 'DUPLICATE_ID', `tourTasks[${taskIndex}].points[${pointIndex}].id`, `旧数据中重复点位 ID：${pointId}`)
        if (pointId) {
          pointIds.add(pointId)
          sourcePointIds.add(pointId)
        }
        if (!nonEmptyString(point.name) || ![point.x, point.y, point.angle].every((value) => typeof value === 'number' && Number.isFinite(value))) issue(report, 'INVALID_POINT', `tourTasks[${taskIndex}].points[${pointIndex}]`, '点位必须包含名称及有限的坐标、朝向')
        for (const [actionIndex, action] of arrayValue(point.actions).entries()) this.validateAction(action, `tourTasks[${taskIndex}].points[${pointIndex}].actions[${actionIndex}]`, false, report, existingActionIds, sourceActionIds)
      })
      if (sourcePaths.length !== Math.max(0, sourcePoints.length - 1)) issue(report, 'NON_CONTINUOUS_PATH', `tourTasks[${taskIndex}].paths`, '路径数量必须连接所有相邻点位')
      sourcePaths.forEach((path, pathIndex) => {
        const pathId = nonEmptyString(path.id)
        if (!pathId) issue(report, 'MISSING_ID', `tourTasks[${taskIndex}].paths[${pathIndex}].id`, '路径缺少稳定 ID')
        else if (existingPathIds.has(pathId)) issue(report, 'ID_CONFLICT', `tourTasks[${taskIndex}].paths[${pathIndex}].id`, `路径 ID 已存在：${pathId}`)
        else if (sourcePathIds.has(pathId)) issue(report, 'DUPLICATE_ID', `tourTasks[${taskIndex}].paths[${pathIndex}].id`, `旧数据中重复路径 ID：${pathId}`)
        if (pathId) sourcePathIds.add(pathId)
        const fromPointId = nonEmptyString(path.fromPointId ?? path.fromPointKey)
        const toPointId = nonEmptyString(path.toPointId ?? path.toPointKey)
        const expectedFrom = nonEmptyString(sourcePoints[pathIndex]?.id)
        const expectedTo = nonEmptyString(sourcePoints[pathIndex + 1]?.id)
        if (fromPointId !== expectedFrom || toPointId !== expectedTo) issue(report, 'NON_CONTINUOUS_PATH', `tourTasks[${taskIndex}].paths[${pathIndex}]`, '路径未按点位数组顺序连续连接')
        for (const [actionIndex, action] of arrayValue(path.actions).entries()) this.validateAction(action, `tourTasks[${taskIndex}].paths[${pathIndex}].actions[${actionIndex}]`, true, report, existingActionIds, sourceActionIds)
      })
      if (!parseDate(task.createdAt)) issue(report, 'INVALID_DATE', `tourTasks[${taskIndex}].createdAt`, '创建时间不是有效日期')
    }

    report.summary.actionsToCreate = tasks.reduce((total, task) => total + arrayValue(task.points).reduce((count, point) => count + arrayValue(point.actions).length, 0) + arrayValue(task.paths).reduce((count, path) => count + arrayValue(path.actions).length, 0), 0)
    report.ready = !report.issues.some((item) => item.level === 'error')
    report.mapBindings = mapBindings
    return { data, version, maps, plugins, personas, tasks, mapBindings, personaBindings, pluginBindings, report }
  }

  private validateAction(action: LegacyRecord, path: string, isPath: boolean, report: LegacyMigrationReport, existingActionIds: Set<string>, sourceActionIds: Set<string>) {
    const actionId = nonEmptyString(action.id)
    if (!actionId) issue(report, 'MISSING_ID', `${path}.id`, '动作缺少稳定 ID')
    else if (existingActionIds.has(actionId)) issue(report, 'ID_CONFLICT', `${path}.id`, `动作 ID 已存在：${actionId}`)
    else if (sourceActionIds.has(actionId)) issue(report, 'DUPLICATE_ID', `${path}.id`, `旧数据中重复动作 ID：${actionId}`)
    if (actionId) sourceActionIds.add(actionId)
    const type = actionType(action.type)
    if (!type) {
      issue(report, 'INVALID_ACTION', `${path}.type`, '动作类型必须是 speech、skill 或 interaction')
      return
    }
    if (isPath && type === 'SKILL') issue(report, 'UNREPRESENTABLE_ACTION', path, '路径动作不支持技能动作')
    if (type === 'SPEECH' && !nonEmptyString(action.narration)) issue(report, 'INVALID_ACTION', path, '语音动作必须包含播报内容')
    if (type === 'SKILL' && !nonEmptyString(action.skillId)) issue(report, 'INVALID_ACTION', path, '技能动作必须包含 skillId')
  }

  private emptyPrepared(report: LegacyMigrationReport, mapBindings: LegacyMigrationMapBindings): PreparedLegacy {
    report.mapBindings = mapBindings
    report.ready = false
    return { data: {}, version: null, maps: [], plugins: [], personas: [], tasks: [], mapBindings, personaBindings: new Map(), pluginBindings: new Map(), report }
  }
}
