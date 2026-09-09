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

export const skillSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.enum(['official', 'cloud']),
  version: z.string(),
  compatible: z.boolean(),
})
export type SkillSummary = z.infer<typeof skillSummarySchema>

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
  requestId: z.string().optional(),
})
export type ApiError = z.infer<typeof apiErrorSchema>
