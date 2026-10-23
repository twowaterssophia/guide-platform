import {
  robotDetailSchema,
  robotRuntimeStateSchema,
  robotSummarySchema,
  robotTaskSummarySchema,
  tourTaskDetailSchema,
  tourTaskSummarySchema,
} from '@guide/contracts'
import type { MapAssetDetail, RobotDetail, RobotPosition, RobotRuntimeState, RobotSummary, RobotTaskSummary, TourTaskDetail, TourTaskSummary } from '@guide/contracts'
import { getMap } from '../maps/maps-api'
import { getTourTask, listTourTasks, tourTasksQueryKey } from '../tour-tasks/tour-tasks-api'

const demoStorageKey = 'guide.robot-console-demo.v2'
const demoTimestamp = '2026-10-01T00:00:00.000Z'

const fixtureTasks: TourTaskDetail[] = [
  {
    id: 'demo-tour-lobby', name: '展厅全景导览', map: { id: 'demo-map-showroom', name: '企业展厅一层' }, persona: null, version: 3,
    points: [
      { id: 'demo-point-start', sequence: 1, name: '接待入口', x: 120, y: 390, angle: 0, actions: [{ id: 'demo-action-start', sequence: 1, type: 'SPEECH', narration: '欢迎来到企业展厅。接下来我将带您了解我们的发展历程与核心产品。' }] },
      { id: 'demo-point-history', sequence: 2, name: '发展历程', x: 360, y: 260, angle: 0, actions: [{ id: 'demo-action-history', sequence: 1, type: 'SPEECH', narration: '这里展示了公司的发展历程，从最初的技术探索到今天的持续创新。' }, { id: 'demo-action-interaction', sequence: 2, type: 'INTERACTION', interactionPrompt: '您想进一步了解哪个阶段？' }] },
      { id: 'demo-point-products', sequence: 3, name: '产品展示区', x: 680, y: 190, angle: 0, actions: [{ id: 'demo-action-products', sequence: 1, type: 'SKILL', skillId: 'gesture-show', skillName: '产品展示手势' }, { id: 'demo-action-product-speech', sequence: 2, type: 'SPEECH', narration: '这一区域集中展示了面向不同场景的智能产品与解决方案。' }] },
      { id: 'demo-point-end', sequence: 4, name: '交流洽谈区', x: 830, y: 390, angle: 0, actions: [{ id: 'demo-action-end', sequence: 1, type: 'SPEECH', narration: '导览到这里就结束了，感谢您的参观，欢迎继续交流。' }] },
    ],
    paths: [
      { id: 'demo-path-1', sequence: 1, fromPointId: 'demo-point-start', toPointId: 'demo-point-history', actions: [{ id: 'demo-path-action-1', sequence: 1, type: 'SPEECH', narration: '请跟随我前往发展历程展区。' }] },
      { id: 'demo-path-2', sequence: 2, fromPointId: 'demo-point-history', toPointId: 'demo-point-products', actions: [] },
      { id: 'demo-path-3', sequence: 3, fromPointId: 'demo-point-products', toPointId: 'demo-point-end', actions: [{ id: 'demo-path-action-3', sequence: 1, type: 'SPEECH', narration: '前方是我们的交流洽谈区。' }] },
    ], createdAt: demoTimestamp, updatedAt: demoTimestamp,
  },
  {
    id: 'demo-tour-compact', name: '访客快速导览', map: { id: 'demo-map-showroom', name: '企业展厅一层' }, persona: null, version: 1,
    points: [
      { id: 'demo-compact-start', sequence: 1, name: '入口', x: 120, y: 390, angle: 0, actions: [{ id: 'demo-compact-a', sequence: 1, type: 'SPEECH', narration: '欢迎参观，先为您介绍展厅的主要内容。' }] },
      { id: 'demo-compact-end', sequence: 2, name: '核心展项', x: 680, y: 190, angle: 0, actions: [{ id: 'demo-compact-b', sequence: 1, type: 'SPEECH', narration: '这里是本次快速导览的核心展项。' }] },
    ], paths: [{ id: 'demo-compact-path', sequence: 1, fromPointId: 'demo-compact-start', toPointId: 'demo-compact-end', actions: [] }], createdAt: '2026-10-02T00:00:00.000Z', updatedAt: demoTimestamp,
  },
]

const fixtureSummaries = fixtureTasks.map((task) => tourTaskSummarySchema.parse({
  id: task.id, name: task.name, mapName: task.map.name, pointCount: task.points.length, version: task.version, createdAt: task.createdAt, updatedAt: task.updatedAt,
}))

const baseRobots = [
  { id: 'demo-robot-01', name: 'T2 V1.2 - 999', connection: 'CONNECTED' as const, batteryPercent: 86 },
  { id: 'demo-robot-02', name: '导览机器人 02', connection: 'CONNECTED' as const, batteryPercent: 63 },
  { id: 'demo-robot-03', name: '导览机器人 03', connection: 'DISCONNECTED' as const, batteryPercent: 41 },
]

interface PersistedRobot {
  volumeDefaultVersion: 1
  connection: 'CONNECTED' | 'DISCONNECTED'
  agentActive: boolean
  dispatchedTasks: RobotTaskSummary[]
  selectedTaskId: string | null
  selectedSnapshot: { task: TourTaskDetail; map: MapAssetDetail | null } | null
  runtime: RobotRuntimeState
}

const initialRuntime: RobotRuntimeState = robotRuntimeStateSchema.parse({
  selectedTaskId: null, position: null, localization: 'UNLOCALIZED', execution: 'IDLE', currentFlowIndex: 0,
  voiceTakeover: false, voice: 'FEMALE', volume: 60, muted: false,
})

function freshRobotState(robotId: string): PersistedRobot {
  const robot = baseRobots.find((item) => item.id === robotId)
  return { volumeDefaultVersion: 1, connection: robot?.connection ?? 'CONNECTED', agentActive: false, dispatchedTasks: [], selectedTaskId: null, selectedSnapshot: null, runtime: initialRuntime }
}

function readStates(): Record<string, PersistedRobot> {
  try {
    const raw = window.localStorage.getItem(demoStorageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as { robots?: Record<string, unknown> }
    const output: Record<string, PersistedRobot> = {}
    for (const robot of baseRobots) {
      const candidate = parsed.robots?.[robot.id]
      if (!candidate || typeof candidate !== 'object') continue
      const value = candidate as Partial<PersistedRobot>
      const runtime = robotRuntimeStateSchema.parse(value.runtime ?? initialRuntime)
      output[robot.id] = {
        ...freshRobotState(robot.id),
        ...value,
        volumeDefaultVersion: 1,
        connection: value.connection === 'DISCONNECTED' ? 'DISCONNECTED' : 'CONNECTED',
        agentActive: value.agentActive === true,
        dispatchedTasks: Array.isArray(value.dispatchedTasks) ? value.dispatchedTasks.map((task) => robotTaskSummarySchema.parse(task)) : [],
        selectedTaskId: typeof value.selectedTaskId === 'string' ? value.selectedTaskId : null,
        selectedSnapshot: value.selectedSnapshot && typeof value.selectedSnapshot === 'object' ? value.selectedSnapshot : null,
        runtime: {
          ...runtime,
          // Update the legacy demo default once; preserve later user volume choices.
          volume: value.volumeDefaultVersion !== 1 && runtime.volume === 72 ? 60 : runtime.volume,
        },
      }
    }
    return output
  } catch {
    return {}
  }
}

function persist(robotId: string, value: PersistedRobot) {
  const states = readStates()
  states[robotId] = value
  window.localStorage.setItem(demoStorageKey, JSON.stringify({ robots: states }))
  window.dispatchEvent(new CustomEvent('robot-console-state-change', { detail: robotId }))
  return value
}

function currentState(robotId: string) {
  if (!baseRobots.some((robot) => robot.id === robotId)) throw new Error('找不到这台机器人')
  return readStates()[robotId] ?? freshRobotState(robotId)
}

function summariesFor(robotId: string) {
  return baseRobots.map((robot) => {
    const state = currentState(robot.id)
    return robotSummarySchema.parse({ ...robot, connection: state.connection, tourTaskCount: state.dispatchedTasks.length })
  }).filter((robot) => robotId ? robot.id === robotId : true)
}

async function resolveTask(taskId: string): Promise<TourTaskDetail> {
  const fixture = fixtureTasks.find((task) => task.id === taskId)
  if (fixture) return fixture
  return tourTaskDetailSchema.parse(await getTourTask(taskId))
}

async function resolveMap(task: TourTaskDetail): Promise<MapAssetDetail | null> {
  if (task.map.id === 'demo-map-showroom') return null
  try { return await getMap(task.map.id) } catch { return null }
}

function getInitialRobotPosition(task: TourTaskDetail) {
  const start = task.points[0]
  return start ? { x: start.x, y: start.y, angle: start.angle } : null
}

function getTourFlowLength(task: TourTaskDetail) {
  return task.points.reduce((count, point, index) => {
    const pointSteps = Math.max(point.actions.length, 1)
    const path = task.points[index + 1]
      ? task.paths.find((item) => item.fromPointId === point.id && item.toPointId === task.points[index + 1].id)
      : undefined
    return count + pointSteps + (task.points[index + 1] ? 1 + (path?.actions.length ?? 0) : 0)
  }, 0)
}

export interface SelectedTourTask {
  task: TourTaskDetail
  map: MapAssetDetail | null
}

export interface PlatformTaskList {
  items: TourTaskSummary[]
  source: 'PLATFORM' | 'DEMO'
}

export interface RobotConsoleApi {
  listRobots(): Promise<RobotSummary[]>
  getRobot(robotId: string): Promise<RobotDetail>
  enterTourAgent(robotId: string): Promise<RobotDetail>
  listPlatformTasks(): Promise<PlatformTaskList>
  listRobotTasks(robotId: string): Promise<RobotTaskSummary[]>
  dispatchTasks(robotId: string, taskIds: string[]): Promise<RobotTaskSummary[]>
  deleteRobotTask(robotId: string, taskId: string): Promise<void>
  selectTask(robotId: string, taskId: string): Promise<SelectedTourTask>
  getSelectedTask(robotId: string): Promise<SelectedTourTask | null>
  startLocalization(robotId: string, target?: RobotPosition): Promise<RobotDetail>
  updateRuntime(robotId: string, patch: Partial<RobotRuntimeState>): Promise<RobotDetail>
  toggleConnection(robotId: string): Promise<RobotDetail>
  resetDemo(): Promise<void>
}

export const robotConsoleQueryKey = ['robot-console-demo'] as const

// The adapter returns { items, source }, unlike the task list's array. Keep its
// cache separate while allowing task mutations to invalidate both by prefix.
export const robotPlatformTasksQueryKey = [...tourTasksQueryKey, { consumer: 'robot-console' }] as const

export const robotConsoleApi: RobotConsoleApi = {
  async listRobots() { return summariesFor('') },

  async getRobot(robotId) {
    const state = currentState(robotId)
    const robot = baseRobots.find((item) => item.id === robotId)!
    return robotDetailSchema.parse({ ...robot, connection: state.connection, tourTaskCount: state.dispatchedTasks.length, agent: state.agentActive ? 'ACTIVE' : 'NOT_ACTIVE', video: state.connection === 'CONNECTED' ? 'AVAILABLE' : 'UNAVAILABLE', runtime: state.runtime })
  },

  async enterTourAgent(robotId) {
    const state = currentState(robotId)
    if (state.connection !== 'CONNECTED') throw new Error('机器人未连接')
    persist(robotId, { ...state, agentActive: true })
    return robotConsoleApi.getRobot(robotId)
  },

  async listPlatformTasks() {
    try {
      const platformItems = await listTourTasks()
      return { items: platformItems, source: 'PLATFORM' as const }
    } catch {
      return { items: fixtureSummaries, source: 'DEMO' as const }
    }
  },

  async listRobotTasks(robotId) { return currentState(robotId).dispatchedTasks },

  async dispatchTasks(robotId, taskIds) {
    const initial = currentState(robotId)
    if (initial.connection !== 'CONNECTED') throw new Error('机器人未连接')
    if (initial.runtime.execution === 'RUNNING' || initial.runtime.execution === 'PAUSED') throw new Error('导览执行期间不能下发任务')
    const platformItems = await robotConsoleApi.listPlatformTasks()
    const ordered = taskIds.map((id) => platformItems.items.find((item) => item.id === id)).filter((item): item is TourTaskSummary => Boolean(item)).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    if (ordered.length !== taskIds.length) throw new Error('所选任务已不存在，请刷新列表')
    const results: RobotTaskSummary[] = []
    for (const summary of ordered) {
      const state = currentState(robotId)
      if (state.dispatchedTasks.some((item) => item.taskId === summary.id && item.taskVersion === summary.version)) continue
      await new Promise((resolve) => window.setTimeout(resolve, 300))
      const task = await resolveTask(summary.id)
      if (task.version !== summary.version) throw new Error(`${summary.name} 已更新，请刷新后重新下发`)
      const result = robotTaskSummarySchema.parse({ taskId: task.id, name: task.name, mapId: task.map.id, mapName: task.map.name, taskVersion: task.version, dispatchState: 'DISPATCHED', downloadedAt: new Date().toISOString() })
      const map = await resolveMap(task)
      const dispatchedTasks = [...state.dispatchedTasks.filter((item) => item.taskId !== task.id), result]
      const selectedSnapshot = state.selectedTaskId === task.id ? { task, map } : state.selectedSnapshot
      persist(robotId, { ...state, dispatchedTasks, selectedSnapshot })
      results.push(result)
    }
    return results
  },

  async deleteRobotTask(robotId, taskId) {
    const state = currentState(robotId)
    if (state.runtime.execution === 'RUNNING' || state.runtime.execution === 'PAUSED') throw new Error('导览执行期间不能删除任务')
    const dispatchedTasks = state.dispatchedTasks.filter((item) => item.taskId !== taskId)
    if (dispatchedTasks.length === state.dispatchedTasks.length) return
    const selected = state.selectedTaskId === taskId
    persist(robotId, { ...state, dispatchedTasks, selectedTaskId: selected ? null : state.selectedTaskId, selectedSnapshot: selected ? null : state.selectedSnapshot, runtime: selected ? { ...state.runtime, selectedTaskId: null, localization: 'UNLOCALIZED', execution: 'IDLE', currentFlowIndex: 0 } : state.runtime })
  },

  async selectTask(robotId, taskId) {
    const state = currentState(robotId)
    if (state.selectedTaskId === taskId && state.selectedSnapshot && state.dispatchedTasks.some((item) => item.taskId === taskId && item.taskVersion === state.selectedSnapshot?.task.version)) return state.selectedSnapshot
    if (state.connection !== 'CONNECTED') throw new Error('机器人未连接')
    if (!state.agentActive) throw new Error('请先启动导览 Agent')
    if (state.runtime.execution === 'RUNNING' || state.runtime.execution === 'PAUSED') throw new Error('结束当前导览后才能切换任务')
    const downloaded = state.dispatchedTasks.find((item) => item.taskId === taskId)
    if (!downloaded) throw new Error('请先将任务下发到机器人')
    const task = await resolveTask(taskId)
    if (task.version !== downloaded.taskVersion) throw new Error('平台任务版本已变化，请重新下发后再选择')
    const map = await resolveMap(task)
    const snapshot = { task, map }
    persist(robotId, { ...state, selectedTaskId: taskId, selectedSnapshot: snapshot, runtime: { ...state.runtime, selectedTaskId: taskId, localization: 'UNLOCALIZED', localizationRequest: null, execution: 'IDLE', currentFlowIndex: 0, voiceTakeover: false, position: getInitialRobotPosition(task) } })
    return snapshot
  },

  async getSelectedTask(robotId) {
    const state = currentState(robotId)
    if (!state.selectedTaskId || !state.selectedSnapshot || !state.dispatchedTasks.some((item) => item.taskId === state.selectedTaskId)) return null
    const downloaded = state.dispatchedTasks.find((item) => item.taskId === state.selectedTaskId)!
    if (state.selectedSnapshot.task.version !== downloaded.taskVersion) return null
    return state.selectedSnapshot
  },

  async startLocalization(robotId, target) {
    const state = currentState(robotId)
    if (state.connection !== 'CONNECTED') throw new Error('机器人未连接')
    if (state.runtime.execution === 'RUNNING' || state.runtime.execution === 'PAUSED') throw new Error('导览执行期间不能重新定位')
    if (state.runtime.localization === 'LOCALIZING') throw new Error('机器人正在定位中')
    const start = state.selectedSnapshot && getInitialRobotPosition(state.selectedSnapshot.task)
    if (!state.agentActive || !start) throw new Error('请先启动导览 Agent 并选择包含起点的任务')
    const dimensions = state.selectedSnapshot?.map?.registration ?? state.selectedSnapshot?.map?.preview
    if (target && (!Number.isFinite(target.x) || !Number.isFinite(target.y) || !Number.isFinite(target.angle) || target.x < 0 || target.y < 0 || target.x > (dimensions?.width ?? 960) || target.y > (dimensions?.height ?? 500))) throw new Error('请选择地图范围内的位置')
    const runtime = robotRuntimeStateSchema.parse({ ...state.runtime, localization: 'LOCALIZING', localizationRequest: { mode: target ? 'POINT' : 'START', target: target ?? start, startedAt: Date.now() } })
    persist(robotId, { ...state, runtime })
    return robotConsoleApi.getRobot(robotId)
  },

  async updateRuntime(robotId, patch) {
    const state = currentState(robotId)
    if (state.connection !== 'CONNECTED') throw new Error('机器人未连接，无法执行此操作')
    const activeExecution = state.runtime.execution === 'RUNNING' || state.runtime.execution === 'PAUSED'
    if (patch.position && (!activeExecution || patch.currentFlowIndex === undefined)) throw new Error('不支持远程移动机器人')
    if (state.runtime.localization === 'LOCALIZING' && patch.position) throw new Error('机器人定位中，请保持静止')
    if (activeExecution && patch.localization && patch.localization !== state.runtime.localization) throw new Error('导览执行期间不能更改定位状态')
    if (patch.localization === 'LOCALIZING' || patch.localizationRequest !== undefined) throw new Error('请通过定位操作发起定位')
    if (patch.localization === 'LOCALIZED' && state.runtime.localization !== 'LOCALIZING') throw new Error('请先发起定位')
    if (patch.execution === 'RUNNING' && patch.localization && patch.localization !== 'LOCALIZED') throw new Error('请先完成定位再开始导览')
    if (patch.execution === 'RUNNING' && state.runtime.execution !== 'PAUSED') {
      if (!state.agentActive) throw new Error('请先启动导览 Agent')
      if (!state.selectedSnapshot || state.runtime.localization !== 'LOCALIZED') throw new Error('请先选择任务并完成起点定位')
    }
    if (patch.execution === 'PAUSED' && state.runtime.execution !== 'RUNNING') throw new Error('当前导览任务未在执行')
    if (patch.execution === 'ENDED' && !activeExecution) throw new Error('当前没有正在执行的导览任务')
    if (patch.currentFlowIndex !== undefined) {
      const flowLength = state.selectedSnapshot ? getTourFlowLength(state.selectedSnapshot.task) : 0
      const starting = patch.execution === 'RUNNING' && state.runtime.execution !== 'PAUSED'
      if ((!activeExecution && !starting) || patch.currentFlowIndex >= flowLength) throw new Error('导览流程状态无效')
    }
    // Localization changes simulated telemetry only; it never issues motion commands.
    const request = state.runtime.localizationRequest
    const localization = patch.localization === 'LOCALIZED' && (!request || Date.now() - request.startedAt >= 60_000) ? 'FAILED' : patch.localization ?? state.runtime.localization
    const localizedPosition = localization === 'LOCALIZED' && patch.localization ? request?.target ?? state.runtime.position : state.runtime.position
    const runtime = robotRuntimeStateSchema.parse({ ...state.runtime, ...patch, localization, localizationRequest: localization === 'LOCALIZING' ? request : null, position: patch.position ?? localizedPosition })
    persist(robotId, { ...state, runtime, selectedTaskId: runtime.selectedTaskId, agentActive: state.agentActive })
    return robotConsoleApi.getRobot(robotId)
  },

  async toggleConnection(robotId) {
    const state = currentState(robotId)
    const connection = state.connection === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED'
    const runtime = connection === 'DISCONNECTED' ? { ...state.runtime, execution: state.runtime.execution === 'RUNNING' ? 'PAUSED' as const : state.runtime.execution, voiceTakeover: false, localization: state.runtime.localization === 'LOCALIZING' ? 'FAILED' as const : state.runtime.localization } : state.runtime
    persist(robotId, { ...state, connection, runtime })
    return robotConsoleApi.getRobot(robotId)
  },

  async resetDemo() { window.localStorage.removeItem(demoStorageKey) },
}
