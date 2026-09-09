import { agentTaskListSchema, agentTaskPackageSchema } from '@guide/contracts'
import type { AgentTaskList, AgentTaskPackage } from '@guide/contracts'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export class AgentApiError extends Error {
  constructor(message: string, readonly code = 'API_ERROR') {
    super(message)
    this.name = 'AgentApiError'
  }
}

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => null) as { code?: string; message?: string } | null
  if (!response.ok) throw new AgentApiError(body?.message ?? '请求失败，请稍后重试', body?.code ?? 'API_ERROR')
  return body
}

export async function listAgentTasks(deviceId: string): Promise<AgentTaskList> {
  const response = await fetch(`${apiBaseUrl}/agent/tasks?deviceId=${encodeURIComponent(deviceId)}`)
  return agentTaskListSchema.parse(await parseResponse(response))
}

export async function downloadAgentTask(taskId: string, deviceId: string): Promise<AgentTaskPackage> {
  const response = await fetch(`${apiBaseUrl}/agent/tasks/${encodeURIComponent(taskId)}/download`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deviceId }),
  })
  return agentTaskPackageSchema.parse(await parseResponse(response))
}

export async function removeAgentTask(taskId: string, deviceId: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/agent/tasks/${encodeURIComponent(taskId)}/download?deviceId=${encodeURIComponent(deviceId)}`, { method: 'DELETE' })
  await parseResponse(response)
}
