import { mcpPluginDetailSchema, mcpPluginListPageSchema } from '@guide/contracts'
import type { McpPluginWriteInput } from '@guide/contracts'
import { deleteResource, getJson, patchJson, postJson } from '../../api/client'

export const pluginsQueryKey = ['mcp-plugins'] as const

export async function listPlugins() {
  return mcpPluginListPageSchema.parse(await getJson('/mcp-plugins'))
}

export async function getPlugin(pluginId: string) {
  return mcpPluginDetailSchema.parse(await getJson(`/mcp-plugins/${pluginId}`))
}

export async function createPlugin(input: McpPluginWriteInput) {
  return mcpPluginDetailSchema.parse(await postJson('/mcp-plugins', input))
}

export async function updatePlugin(pluginId: string, input: McpPluginWriteInput) {
  return mcpPluginDetailSchema.parse(await patchJson(`/mcp-plugins/${pluginId}`, input))
}

export async function refreshPlugin(pluginId: string) {
  return mcpPluginDetailSchema.parse(await postJson(`/mcp-plugins/${pluginId}/refresh-tools`, {}))
}

export async function deletePlugin(pluginId: string) {
  await deleteResource(`/mcp-plugins/${pluginId}`)
}
