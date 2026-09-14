import {
  personaDetailSchema,
  personaListPageSchema,
  skillListSchema,
} from '@guide/contracts'
import type { PersonaUpdateInput, PersonaWriteInput, SkillList } from '@guide/contracts'
import { mcpPluginListPageSchema } from '@guide/contracts'
import { deleteResource, getJson, patchJson, postJson } from '../../api/client'

export const personaQueryKey = ['personas'] as const

export async function listPersonas() {
  return personaListPageSchema.parse(await getJson('/personas'))
}

export async function getPersona(personaId: string) {
  return personaDetailSchema.parse(await getJson(`/personas/${personaId}`))
}

export async function createPersona(input: PersonaWriteInput) {
  return personaDetailSchema.parse(await postJson('/personas', input))
}

export async function updatePersona(personaId: string, input: PersonaUpdateInput) {
  return personaDetailSchema.parse(await patchJson(`/personas/${personaId}`, input))
}

export async function deletePersona(personaId: string) {
  await deleteResource(`/personas/${personaId}`)
}

export async function listCompatibleSkills(): Promise<SkillList> {
  return skillListSchema.parse(await getJson('/skills?compatible=true'))
}

export async function listPlugins() {
  return mcpPluginListPageSchema.parse(await getJson('/mcp-plugins'))
}
