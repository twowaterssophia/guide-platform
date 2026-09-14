import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { McpPlugin, PluginAuthType, Prisma } from '@prisma/client'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { mcpPluginWriteInputSchema, mcpToolSchema } from '@guide/contracts'
import type { McpPluginDetail, McpPluginListPage, McpPluginSummary, McpPluginWriteInput, McpTool } from '@guide/contracts'
import { PrismaService } from '../database/prisma.service'
import { CurrentUserService } from '../identity/current-user.service'

type PluginWithCount = McpPlugin & { _count: { personaLinks: number } }

function parseTools(value: Prisma.JsonValue | null): McpTool[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((tool) => {
    const parsed = mcpToolSchema.safeParse(tool)
    return parsed.success ? [parsed.data] : []
  })
}

function toSummary(plugin: McpPlugin): McpPluginSummary {
  return {
    id: plugin.id,
    name: plugin.name,
    description: plugin.description,
    tools: parseTools(plugin.tools),
    createdAt: plugin.createdAt.toISOString(),
    lastRefreshedAt: plugin.lastRefreshedAt?.toISOString() ?? null,
  }
}

function toDetail(plugin: PluginWithCount): McpPluginDetail {
  return {
    ...toSummary(plugin),
    description: plugin.description,
    examples: plugin.examples,
    serviceUrl: plugin.serviceUrl,
    authType: plugin.authType,
    hasCredentials: Boolean(plugin.encryptedConfiguration),
    customHeaders: plugin.customHeaders && typeof plugin.customHeaders === 'object' && !Array.isArray(plugin.customHeaders)
      ? Object.fromEntries(Object.entries(plugin.customHeaders).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
      : {},
    personaCount: plugin._count.personaLinks,
  }
}

function validationMessage(issues: Array<{ path: PropertyKey[]; message: string }>) {
  return issues.map((issue) => `${issue.path.join('.') || 'body'}：${issue.message}`).join('；')
}

function parseInput(input: unknown): McpPluginWriteInput {
  const parsed = mcpPluginWriteInputSchema.safeParse(input)
  if (!parsed.success) throw new BadRequestException({ code: 'VALIDATION_ERROR', message: validationMessage(parsed.error.issues) })
  return parsed.data
}

function encryptCredentials(credentials: McpPluginWriteInput['credentials']) {
  if (!hasCredentials(credentials)) return null
  const key = createHash('sha256').update(process.env.MCP_CREDENTIALS_KEY ?? 'guide-local-development-only').digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(credentials), 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64')
}

function hasCredentials(credentials: McpPluginWriteInput['credentials']) {
  return Boolean(credentials && Object.values(credentials).some((value) => value?.trim()))
}

function decryptCredentials(encryptedConfiguration: string | null): Record<string, string> {
  if (!encryptedConfiguration) return {}
  try {
    const payload = Buffer.from(encryptedConfiguration, 'base64')
    const iv = payload.subarray(0, 12)
    const tag = payload.subarray(12, 28)
    const encrypted = payload.subarray(28)
    const key = createHash('sha256').update(process.env.MCP_CREDENTIALS_KEY ?? 'guide-local-development-only').digest()
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    const value = JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')) as unknown
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
  } catch {
    throw new ConflictException({ code: 'MCP_CREDENTIALS_UNAVAILABLE', message: '插件认证信息不可用，请重新填写认证信息' })
  }
}

function mcpResponseBody(raw: string, contentType: string | null): unknown {
  if (!contentType?.includes('text/event-stream')) return JSON.parse(raw) as unknown
  const dataLines = raw.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).filter(Boolean)
  const last = dataLines.at(-1)
  return last ? JSON.parse(last) as unknown : null
}

@Injectable()
export class McpPluginsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CurrentUserService) private readonly currentUser: CurrentUserService,
  ) {}

  async list(): Promise<McpPluginListPage> {
    const user = await this.currentUser.getCurrentUser()
    const plugins = await this.prisma.mcpPlugin.findMany({ where: { ownerId: user.id }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] })
    return { items: plugins.map(toSummary) }
  }

  async get(pluginId: string): Promise<McpPluginDetail> {
    const user = await this.currentUser.getCurrentUser()
    const plugin = await this.prisma.mcpPlugin.findFirst({
      where: { id: pluginId, ownerId: user.id },
      include: { _count: { select: { personaLinks: true } } },
    })
    if (!plugin) throw new NotFoundException('插件不存在')
    return toDetail(plugin)
  }

  async create(input: unknown): Promise<McpPluginDetail> {
    const parsed = parseInput(input)
    if (parsed.keepExistingCredentials && parsed.authType !== 'NONE' && !hasCredentials(parsed.credentials)) {
      throw new BadRequestException({ code: 'MCP_CREDENTIALS_REQUIRED', message: '新插件必须填写认证信息' })
    }
    const user = await this.currentUser.getCurrentUser()
    const plugin = await this.prisma.mcpPlugin.create({
      data: {
        ownerId: user.id,
        name: parsed.name,
        description: parsed.description,
        examples: parsed.examples,
        serviceUrl: parsed.serviceUrl,
        authType: parsed.authType as PluginAuthType,
        encryptedConfiguration: encryptCredentials(parsed.credentials),
        customHeaders: parsed.customHeaders,
        tools: [],
        lastRefreshedAt: null,
      },
      include: { _count: { select: { personaLinks: true } } },
    })
    try {
      return await this.refresh(plugin.id)
    } catch (error) {
      await this.prisma.mcpPlugin.delete({ where: { id: plugin.id } }).catch(() => undefined)
      throw error
    }
  }

  async update(pluginId: string, input: unknown): Promise<McpPluginDetail> {
    const parsed = parseInput(input)
    const user = await this.currentUser.getCurrentUser()
    const exists = await this.prisma.mcpPlugin.findFirst({ where: { id: pluginId, ownerId: user.id }, select: { id: true, authType: true, encryptedConfiguration: true } })
    if (!exists) throw new NotFoundException('插件不存在')
    const preserveCredentials = parsed.keepExistingCredentials && !hasCredentials(parsed.credentials)
    if (preserveCredentials && (exists.authType !== parsed.authType || !exists.encryptedConfiguration)) {
      throw new BadRequestException({ code: 'MCP_CREDENTIALS_REQUIRED', message: '认证方式已变化，请填写新的认证信息' })
    }
    const plugin = await this.prisma.mcpPlugin.update({
      where: { id: pluginId },
      data: {
        name: parsed.name,
        description: parsed.description,
        examples: parsed.examples,
        serviceUrl: parsed.serviceUrl,
        authType: parsed.authType as PluginAuthType,
        encryptedConfiguration: parsed.authType === 'NONE'
          ? null
          : preserveCredentials
          ? exists.encryptedConfiguration
          : encryptCredentials(parsed.credentials),
        customHeaders: parsed.customHeaders,
      },
      include: { _count: { select: { personaLinks: true } } },
    })
    return toDetail(plugin)
  }

  async refresh(pluginId: string): Promise<McpPluginDetail> {
    const user = await this.currentUser.getCurrentUser()
    const plugin = await this.prisma.mcpPlugin.findFirst({ where: { id: pluginId, ownerId: user.id } })
    if (!plugin) throw new NotFoundException('插件不存在')

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(plugin.customHeaders && typeof plugin.customHeaders === 'object' && !Array.isArray(plugin.customHeaders)
        ? Object.fromEntries(Object.entries(plugin.customHeaders).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
        : {}),
    }
    const credentials = decryptCredentials(plugin.encryptedConfiguration)
    if (plugin.authType === 'BEARER' && credentials.token) headers.authorization = `Bearer ${credentials.token}`
    if (plugin.authType === 'API_KEY' && credentials.headerName && credentials.apiKey) headers[credentials.headerName] = credentials.apiKey
    if (plugin.authType === 'BASIC' && credentials.username && credentials.password) headers.authorization = `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`

    let sessionId: string | null = null
    const request = async (id: number, method: string, params?: Record<string, unknown>) => {
      const requestHeaders: Record<string, string> = { ...headers }
      if (sessionId) requestHeaders['mcp-session-id'] = sessionId
      const response = await fetch(plugin.serviceUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) }),
        signal: AbortSignal.timeout(10_000),
      })
      const bodyText = await response.text()
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      sessionId = response.headers.get('mcp-session-id') ?? sessionId
      const body = mcpResponseBody(bodyText, response.headers.get('content-type')) as { error?: { message?: string }; result?: { tools?: unknown[] } } | null
      if (body?.error) throw new Error(body.error.message ?? 'MCP 请求失败')
      return body?.result
    }
    try {
      await request(1, 'initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'guide-platform', version: '0.1.0' },
      })
      const notificationHeaders: Record<string, string> = { ...headers }
      if (sessionId) notificationHeaders['mcp-session-id'] = sessionId
      await fetch(plugin.serviceUrl, {
        method: 'POST',
        headers: notificationHeaders,
        body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }),
        signal: AbortSignal.timeout(10_000),
      })
      const result = await request(2, 'tools/list', {})
      const tools = Array.isArray(result?.tools)
        ? result.tools.flatMap((tool) => {
          if (!tool || typeof tool !== 'object' || typeof (tool as { name?: unknown }).name !== 'string') return []
          const item = tool as { name: string; description?: unknown }
          return [{ name: item.name, ...(typeof item.description === 'string' ? { description: item.description } : {}) }]
        })
        : []
      const updated = await this.prisma.mcpPlugin.update({
        where: { id: pluginId },
        data: { tools, lastRefreshedAt: new Date() },
        include: { _count: { select: { personaLinks: true } } },
      })
      return toDetail(updated)
    } catch {
      throw new ConflictException({ code: 'MCP_PROVIDER_UNAVAILABLE', message: '暂时无法连接 MCP 服务，请检查地址和认证信息后重试' })
    }
  }

  async delete(pluginId: string): Promise<void> {
    const user = await this.currentUser.getCurrentUser()
    const plugin = await this.prisma.mcpPlugin.findFirst({ where: { id: pluginId, ownerId: user.id }, select: { id: true } })
    if (!plugin) throw new NotFoundException('插件不存在')
    await this.prisma.mcpPlugin.delete({ where: { id: plugin.id } })
  }
}
