import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { PrismaClient } from '@prisma/client'
import type { PrismaService } from '../src/database/prisma.service'
import { McpPluginsService } from '../src/mcp-plugins/mcp-plugins.service'

test('refreshes MCP tools through initialize and tools/list without exposing credentials', async (context) => {
  const prisma = new PrismaClient()
  const suffix = randomUUID()
  const owner = await prisma.user.create({ data: { email: `mcp-refresh-${suffix}@example.com` } })
  const currentUser = { getCurrentUser: async () => owner }
  const service = new McpPluginsService(prisma as unknown as PrismaService, currentUser as never)
  const originalFetch = globalThis.fetch
  const calls: string[] = []
  globalThis.fetch = (async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as { method: string }
    calls.push(body.method)
    if (body.method === 'initialize') return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: {} }), { headers: { 'content-type': 'application/json', 'mcp-session-id': 'session-1' } })
    if (body.method === 'notifications/initialized') return new Response(null, { status: 202 })
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 2, result: { tools: [{ name: 'lookup', description: '查询知识库' }] } }), { headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  context.after(async () => {
    globalThis.fetch = originalFetch
    await prisma.user.delete({ where: { id: owner.id } })
    await prisma.$disconnect()
  })

  const created = await service.create({ name: '知识库', description: '查询', examples: '查询展品', serviceUrl: 'https://example.com/mcp', authType: 'NONE', credentials: {}, customHeaders: {} })
  assert.equal(created.hasCredentials, false)
  assert.deepEqual(calls, ['initialize', 'notifications/initialized', 'tools/list'])
  assert.deepEqual(created.tools, [{ name: 'lookup', description: '查询知识库' }])
  assert.ok(created.lastRefreshedAt)
})

test('keeps encrypted credentials when editing without replacement values', async (context) => {
  const prisma = new PrismaClient()
  const suffix = randomUUID()
  const owner = await prisma.user.create({ data: { email: `mcp-credentials-${suffix}@example.com` } })
  const service = new McpPluginsService(prisma as unknown as PrismaService, { getCurrentUser: async () => owner } as never)
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as { method: string }
    if (body.method === 'notifications/initialized') return new Response(null, { status: 202 })
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: body.method === 'tools/list' ? { tools: [] } : {} }), { headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  context.after(async () => {
    globalThis.fetch = originalFetch
    await prisma.user.delete({ where: { id: owner.id } })
    await prisma.$disconnect()
  })

  const created = await service.create({ name: '受保护插件', description: '描述', examples: '示例', serviceUrl: 'https://example.com/mcp', authType: 'BEARER', credentials: { token: 'secret-token' }, customHeaders: {} })
  const before = await prisma.mcpPlugin.findUniqueOrThrow({ where: { id: created.id }, select: { encryptedConfiguration: true } })
  const updated = await service.update(created.id, { name: '受保护插件 2', description: '描述', examples: '示例', serviceUrl: 'https://example.com/mcp', authType: 'BEARER', credentials: {}, keepExistingCredentials: true, customHeaders: {} })
  const after = await prisma.mcpPlugin.findUniqueOrThrow({ where: { id: created.id }, select: { encryptedConfiguration: true } })
  assert.equal(updated.hasCredentials, true)
  assert.equal(after.encryptedConfiguration, before.encryptedConfiguration)
})
