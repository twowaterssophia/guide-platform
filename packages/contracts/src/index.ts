import { z } from 'zod'

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('guide-api'),
  timestamp: z.string().datetime(),
})
export type HealthResponse = z.infer<typeof healthResponseSchema>

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
  pluginIds: z.array(z.string()),
  plugins: z.array(z.object({ id: z.string(), name: z.string() })),
})
export type PersonaDetail = z.infer<typeof personaDetailSchema>

export const personaListPageSchema = z.object({
  items: z.array(personaSummarySchema),
  nextCursor: z.string().optional(),
})
export type PersonaListPage = z.infer<typeof personaListPageSchema>

export const personaWriteInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  voice: z.string().trim().min(1).max(80),
  prompt: z.string().trim().max(1_000),
  presetSkillsEnabled: z.boolean(),
  pluginIds: z.array(z.string().min(1)).max(50).default([]),
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
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type TourTaskSummary = z.infer<typeof tourTaskSummarySchema>

export const tourTaskListSchema = z.array(tourTaskSummarySchema)
export type TourTaskList = z.infer<typeof tourTaskListSchema>

export const taskActionTypeSchema = z.enum(['SPEECH', 'SKILL', 'INTERACTION'])
export type TaskActionType = z.infer<typeof taskActionTypeSchema>

export const tourTaskMapRefSchema = z.object({
  id: z.string(),
  name: z.string(),
})
export type TourTaskMapRef = z.infer<typeof tourTaskMapRefSchema>

export const tourTaskPersonaRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  isSystemDefault: z.boolean(),
})
export type TourTaskPersonaRef = z.infer<typeof tourTaskPersonaRefSchema>

const speechTaskActionSchema = z.object({
  id: z.string(),
  sequence: z.number().int().positive(),
  type: z.literal('SPEECH'),
  narration: z.string(),
})

const skillTaskActionSchema = z.object({
  id: z.string(),
  sequence: z.number().int().positive(),
  type: z.literal('SKILL'),
  skillId: z.string(),
  skillName: z.string(),
})

const interactionTaskActionSchema = z.object({
  id: z.string(),
  sequence: z.number().int().positive(),
  type: z.literal('INTERACTION'),
  interactionPrompt: z.string().nullable(),
})

export const taskActionSchema = z.discriminatedUnion('type', [
  speechTaskActionSchema,
  skillTaskActionSchema,
  interactionTaskActionSchema,
])
export type TaskAction = z.infer<typeof taskActionSchema>

export const pathTaskActionSchema = z.discriminatedUnion('type', [
  speechTaskActionSchema,
  interactionTaskActionSchema,
])
export type PathTaskAction = z.infer<typeof pathTaskActionSchema>

export const tourPointSchema = z.object({
  id: z.string(),
  sequence: z.number().int().positive(),
  name: z.string(),
  x: z.number().finite(),
  y: z.number().finite(),
  angle: z.number().finite(),
  actions: z.array(taskActionSchema),
})
export type TourPoint = z.infer<typeof tourPointSchema>

export const tourPathSchema = z.object({
  id: z.string(),
  sequence: z.number().int().positive(),
  fromPointId: z.string(),
  toPointId: z.string(),
  actions: z.array(pathTaskActionSchema),
})
export type TourPath = z.infer<typeof tourPathSchema>

export const tourTaskDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  map: tourTaskMapRefSchema,
  persona: tourTaskPersonaRefSchema.nullable(),
  version: z.number().int().positive(),
  points: z.array(tourPointSchema),
  paths: z.array(tourPathSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type TourTaskDetail = z.infer<typeof tourTaskDetailSchema>

const taskActionWriteBaseSchema = z.object({
  type: taskActionTypeSchema,
})

export const pointTaskActionWriteSchema = z.discriminatedUnion('type', [
  taskActionWriteBaseSchema.extend({
    type: z.literal('SPEECH'),
    narration: z.string().trim().min(1).max(4_000),
  }),
  taskActionWriteBaseSchema.extend({
    type: z.literal('SKILL'),
    skillId: z.string().trim().min(1),
  }),
  taskActionWriteBaseSchema.extend({
    type: z.literal('INTERACTION'),
    interactionPrompt: z.string().trim().max(4_000).optional(),
  }),
])
export type PointTaskActionWrite = z.infer<typeof pointTaskActionWriteSchema>

export const pathTaskActionWriteSchema = z.discriminatedUnion('type', [
  taskActionWriteBaseSchema.extend({
    type: z.literal('SPEECH'),
    narration: z.string().trim().min(1).max(4_000),
  }),
  taskActionWriteBaseSchema.extend({
    type: z.literal('INTERACTION'),
    interactionPrompt: z.string().trim().max(4_000).optional(),
  }),
])
export type PathTaskActionWrite = z.infer<typeof pathTaskActionWriteSchema>

export const tourPointWriteSchema = z.object({
  key: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  x: z.number().finite(),
  y: z.number().finite(),
  angle: z.number().finite(),
  actions: z.array(pointTaskActionWriteSchema).max(50),
})
export type TourPointWrite = z.infer<typeof tourPointWriteSchema>

export const tourPathWriteSchema = z.object({
  fromPointKey: z.string().trim().min(1).max(80),
  toPointKey: z.string().trim().min(1).max(80),
  actions: z.array(pathTaskActionWriteSchema).max(50),
})
export type TourPathWrite = z.infer<typeof tourPathWriteSchema>

const tourTaskWriteBaseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  mapId: z.string().trim().min(1),
  personaId: z.string().trim().min(1).nullable(),
  points: z.array(tourPointWriteSchema).min(1).max(200),
  paths: z.array(tourPathWriteSchema).max(199),
})

const validateTourTaskWrite = (
  input: z.infer<typeof tourTaskWriteBaseSchema>,
  context: z.RefinementCtx,
) => {
  const keys = input.points.map((point) => point.key)
  const duplicateKey = keys.find((key, index) => keys.indexOf(key) !== index)
  if (duplicateKey) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['points'], message: `点位标识 ${duplicateKey} 重复` })
  }
  if (input.paths.length !== Math.max(0, input.points.length - 1)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['paths'], message: '路径数量必须与相邻点位连接数量一致' })
  }
  input.paths.forEach((path, index) => {
    const fromPoint = input.points[index]
    const toPoint = input.points[index + 1]
    if (!fromPoint || !toPoint || path.fromPointKey !== fromPoint.key || path.toPointKey !== toPoint.key) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['paths', index], message: '路径必须按点位顺序连续连接' })
    }
  })
}

export const tourTaskWriteInputSchema = tourTaskWriteBaseSchema.superRefine(validateTourTaskWrite)
export type TourTaskWriteInput = z.infer<typeof tourTaskWriteInputSchema>

export const tourTaskUpdateInputSchema = tourTaskWriteBaseSchema
  .extend({ expectedVersion: z.number().int().positive() })
  .superRefine(validateTourTaskWrite)
export type TourTaskUpdateInput = z.infer<typeof tourTaskUpdateInputSchema>

export const agentTaskSyncStateSchema = z.enum(['AVAILABLE', 'DOWNLOADED', 'UPDATE_AVAILABLE'])
export type AgentTaskSyncState = z.infer<typeof agentTaskSyncStateSchema>

export const agentTaskSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  mapName: z.string(),
  pointCount: z.number().int().nonnegative(),
  remoteVersion: z.number().int().positive(),
  downloadedVersion: z.number().int().positive().nullable(),
  syncState: agentTaskSyncStateSchema,
  updatedAt: z.string().datetime(),
})
export type AgentTaskSummary = z.infer<typeof agentTaskSummarySchema>

export const agentTaskListSchema = z.object({
  deviceId: z.string().min(1),
  items: z.array(agentTaskSummarySchema),
})
export type AgentTaskList = z.infer<typeof agentTaskListSchema>

export const agentDeviceInputSchema = z.object({
  deviceId: z.string().trim().min(1).max(120),
})
export type AgentDeviceInput = z.infer<typeof agentDeviceInputSchema>

export const pcdEncodingSchema = z.enum(['ascii', 'binary', 'binary_compressed'])
export type PcdEncoding = z.infer<typeof pcdEncodingSchema>

export const mapRegistrationMetadataSchema = z.object({
  formatVersion: z.literal(1),
  resolution: z.number().positive().max(10),
  origin: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    yaw: z.number().finite(),
  }),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  frameId: z.string().trim().min(1).max(120),
  imageAxes: z.object({
    x: z.enum(['left', 'right']),
    y: z.enum(['up', 'down']),
  }),
  occupiedThreshold: z.number().min(0).max(1),
  freeThreshold: z.number().min(0).max(1),
  pcdTransform: z.object({
    translation: z.object({
      x: z.number().finite(),
      y: z.number().finite(),
      z: z.number().finite(),
    }),
    rotation: z.object({
      x: z.number().finite(),
      y: z.number().finite(),
      z: z.number().finite(),
      w: z.number().finite(),
    }),
  }),
}).superRefine((metadata, context) => {
  if (metadata.freeThreshold >= metadata.occupiedThreshold) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['freeThreshold'],
      message: '空闲阈值必须小于占用阈值',
    })
  }
})
export type MapRegistrationMetadata = z.infer<typeof mapRegistrationMetadataSchema>

export const agentTaskPackageSchema = z.object({
  task: tourTaskDetailSchema,
  map: z.object({
    id: z.string(),
    name: z.string(),
    version: z.number().int().positive(),
    registration: mapRegistrationMetadataSchema,
    pcd: z.object({
      fileName: z.string(),
      mediaType: z.string(),
      encoding: pcdEncodingSchema,
      sizeBytes: z.number().int().nonnegative(),
      contentBase64: z.string().min(1),
    }),
    preview: z.object({
      fileName: z.string(),
      mediaType: z.literal('image/png'),
      sizeBytes: z.number().int().nonnegative(),
      contentBase64: z.string().min(1),
    }),
  }),
  synchronizedVersion: z.number().int().positive(),
  downloadedAt: z.string().datetime(),
})
export type AgentTaskPackage = z.infer<typeof agentTaskPackageSchema>

export const pluginAuthTypeSchema = z.enum(['NONE', 'BEARER', 'API_KEY', 'BASIC'])
export type PluginAuthType = z.infer<typeof pluginAuthTypeSchema>

export const mcpToolSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})
export type McpTool = z.infer<typeof mcpToolSchema>

export const mcpPluginSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tools: z.array(mcpToolSchema),
  createdAt: z.string().datetime(),
  lastRefreshedAt: z.string().datetime().nullable(),
})
export type McpPluginSummary = z.infer<typeof mcpPluginSummarySchema>

export const mcpPluginDetailSchema = mcpPluginSummarySchema.extend({
  examples: z.string(),
  serviceUrl: z.string().url(),
  authType: pluginAuthTypeSchema,
  hasCredentials: z.boolean(),
  customHeaders: z.record(z.string()),
  personaCount: z.number().int().nonnegative(),
})
export type McpPluginDetail = z.infer<typeof mcpPluginDetailSchema>

export const mcpPluginListPageSchema = z.object({
  items: z.array(mcpPluginSummarySchema),
  nextCursor: z.string().optional(),
})
export type McpPluginListPage = z.infer<typeof mcpPluginListPageSchema>

const mcpCredentialsSchema = z.object({
  token: z.string().optional(),
  headerName: z.string().optional(),
  apiKey: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
}).optional()

export const mcpPluginWriteInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(2_000),
  examples: z.string().trim().min(1).max(2_000),
  serviceUrl: z.string().url().max(2_000),
  authType: pluginAuthTypeSchema,
  credentials: mcpCredentialsSchema,
  keepExistingCredentials: z.boolean().default(false),
  customHeaders: z.record(z.string()).default({}),
}).superRefine((input, context) => {
  const credentials = input.credentials
  if (input.keepExistingCredentials && (!credentials || Object.values(credentials).every((value) => !value?.trim()))) return
  if (input.authType === 'BEARER' && !credentials?.token?.trim()) context.addIssue({ code: z.ZodIssueCode.custom, path: ['credentials', 'token'], message: '请输入 Bearer Token' })
  if (input.authType === 'API_KEY' && (!credentials?.headerName?.trim() || !credentials.apiKey?.trim())) context.addIssue({ code: z.ZodIssueCode.custom, path: ['credentials'], message: '请输入请求头名称和 API Key' })
  if (input.authType === 'BASIC' && (!credentials?.username?.trim() || !credentials.password)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['credentials'], message: '请输入用户名和密码' })
})
export type McpPluginWriteInput = z.infer<typeof mcpPluginWriteInputSchema>

export const mapAssetSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  pcdFileName: z.string(),
  pcdEncoding: pcdEncodingSchema.nullable(),
  pcdSizeBytes: z.number().int().nonnegative(),
  previewAvailable: z.boolean(),
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type MapAssetSummary = z.infer<typeof mapAssetSummarySchema>

export const mapAssetListPageSchema = z.object({
  items: z.array(mapAssetSummarySchema),
  nextCursor: z.string().optional(),
})
export type MapAssetListPage = z.infer<typeof mapAssetListPageSchema>

export const mapAssetFileSchema = z.object({
  fileName: z.string(),
  mediaType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
})
export type MapAssetFile = z.infer<typeof mapAssetFileSchema>

export const mapAssetPreviewSchema = mapAssetFileSchema.extend({
  url: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})
export type MapAssetPreview = z.infer<typeof mapAssetPreviewSchema>

export const mapAssetDetailSchema = mapAssetSummarySchema.extend({
  pcd: mapAssetFileSchema.extend({ encoding: pcdEncodingSchema.nullable() }),
  preview: mapAssetPreviewSchema.nullable(),
  registration: mapRegistrationMetadataSchema.nullable(),
  referencedTaskCount: z.number().int().nonnegative(),
})
export type MapAssetDetail = z.infer<typeof mapAssetDetailSchema>

export const mapAssetRenameInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  expectedVersion: z.number().int().positive(),
})
export type MapAssetRenameInput = z.infer<typeof mapAssetRenameInputSchema>

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().min(1),
})
export type ApiError = z.infer<typeof apiErrorSchema>
