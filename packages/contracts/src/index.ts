import { z } from 'zod'

export const providerModeSchema = z.enum(['demo', 'sandbox', 'production'])
export type ProviderMode = z.infer<typeof providerModeSchema>

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('guide-api'),
  timestamp: z.string().datetime(),
})
export type HealthResponse = z.infer<typeof healthResponseSchema>

export const runtimeInfoSchema = z.object({
  identityProvider: providerModeSchema,
  skillProvider: providerModeSchema,
})
export type RuntimeInfo = z.infer<typeof runtimeInfoSchema>

export const skillSourceSchema = z.enum(['official', 'cloud'])
export type SkillSource = z.infer<typeof skillSourceSchema>

export const skillSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  source: skillSourceSchema,
  version: z.string(),
  compatible: z.boolean(),
})
export type SkillSummary = z.infer<typeof skillSummarySchema>

export const skillListSchema = z.array(skillSummarySchema)
export type SkillList = z.infer<typeof skillListSchema>

export const personaCustomSkillSchema = z.object({
  id: z.string(),
  skillId: z.string(),
  skillName: z.string(),
  source: skillSourceSchema,
  instruction: z.string(),
  example: z.string(),
  sequence: z.number().int().nonnegative(),
})
export type PersonaCustomSkill = z.infer<typeof personaCustomSkillSchema>

export const personaSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  voice: z.string(),
  isSystemDefault: z.boolean(),
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type PersonaSummary = z.infer<typeof personaSummarySchema>

export const personaDetailSchema = personaSummarySchema.extend({
  prompt: z.string(),
  presetSkillsEnabled: z.boolean(),
  customSkills: z.array(personaCustomSkillSchema),
})
export type PersonaDetail = z.infer<typeof personaDetailSchema>

export const personaListPageSchema = z.object({
  items: z.array(personaSummarySchema),
  nextCursor: z.string().optional(),
})
export type PersonaListPage = z.infer<typeof personaListPageSchema>

export const personaCustomSkillInputSchema = z.object({
  skillId: z.string().min(1),
  instruction: z.string().trim().min(1).max(2_000),
  example: z.string().trim().min(1).max(2_000),
})
export type PersonaCustomSkillInput = z.infer<typeof personaCustomSkillInputSchema>

export const personaWriteInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  voice: z.string().trim().min(1).max(80),
  prompt: z.string().trim().max(8_000),
  presetSkillsEnabled: z.boolean(),
  customSkills: z.array(personaCustomSkillInputSchema).max(50),
})
export type PersonaWriteInput = z.infer<typeof personaWriteInputSchema>

export const personaUpdateInputSchema = personaWriteInputSchema.extend({
  expectedVersion: z.number().int().positive(),
})
export type PersonaUpdateInput = z.infer<typeof personaUpdateInputSchema>

export const tourTaskSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  mapName: z.string(),
  pointCount: z.number().int().nonnegative(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type TourTaskSummary = z.infer<typeof tourTaskSummarySchema>

export const tourTaskListSchema = z.array(tourTaskSummarySchema)
export type TourTaskList = z.infer<typeof tourTaskListSchema>

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().min(1),
})
export type ApiError = z.infer<typeof apiErrorSchema>
