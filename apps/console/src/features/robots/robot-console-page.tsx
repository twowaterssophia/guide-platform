import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, ArrowRight, Check, ChevronDown,
  Mic, Minus, Monitor, Pause, Play, Plus, RotateCcw, RotateCw,
  Send, Signal, Trash2, X, ZoomIn, ZoomOut,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { MapAssetDetail, RobotPosition, RobotRuntimeState, RobotSummary, RobotTaskSummary, TaskAction, TourTaskDetail } from '@guide/contracts'
import { mapPreviewUrl } from '../maps/maps-api'
import { useConfirmModalController, useToastStackController } from '../../ui-adapters'
import { robotConsoleApi, robotConsoleQueryKey, robotPlatformTasksQueryKey } from './robot-console-api'
import type { PlatformTaskList } from './robot-console-api'
import { RobotTourFlow } from './robot-tour-flow'
import type { TourFlowEntry } from './robot-tour-flow'
import './robot-console.css'

function getActionContent(action: TaskAction) {
  if (action.type === 'SPEECH') return action.narration
  if (action.type === 'SKILL') return action.skillName ?? '技能动作'
  return action.interactionPrompt || '语音问答'
}

function getActionLabel(action: { type: string; narration?: string; skillName?: string; interactionPrompt?: string | null }) {
  if (action.type === 'SPEECH') return `语音播报「${(action.narration ?? '').slice(0, 10)}${(action.narration ?? '').length > 10 ? '…' : ''}」`
  if (action.type === 'SKILL') return `执行技能「${action.skillName ?? '技能动作'}」`
  return `语音互动${action.interactionPrompt ? `「${action.interactionPrompt.slice(0, 10)}…」` : ''}`
}

function buildFlow(task: TourTaskDetail): TourFlowEntry[] {
  const entries: TourFlowEntry[] = []
  task.points.forEach((point, pointIndex) => {
    const target = { x: point.x, y: point.y, angle: point.angle }
    if (point.actions.length === 0) entries.push({ id: `${point.id}:arrival`, kind: 'ARRIVAL', stage: 'POINT', pointName: point.name, pointIndex, target, content: point.name, title: `抵达${point.name}` })
    point.actions.forEach((action) => entries.push({ id: action.id, kind: 'ACTION', stage: 'POINT', pointName: point.name, pointIndex, target, actionType: action.type, content: getActionContent(action), title: getActionLabel(action) }))
    const nextPoint = task.points[pointIndex + 1]
    if (nextPoint) {
      const path = task.paths.find((item) => item.fromPointId === point.id && item.toPointId === nextPoint.id)
      const nextTarget = { x: nextPoint.x, y: nextPoint.y, angle: nextPoint.angle }
      entries.push({ id: path?.id ?? `move:${point.id}:${nextPoint.id}`, kind: 'MOVE', stage: 'PATH', pointName: point.name, pointIndex, target: nextTarget, content: `移动至${nextPoint.name}`, title: `移动至${nextPoint.name}`, description: `${point.name} → ${nextPoint.name}` })
      path?.actions.forEach((action) => entries.push({ id: action.id, kind: 'ACTION', stage: 'PATH', pointName: point.name, pointIndex, target: nextTarget, actionType: action.type, content: getActionContent(action), title: getActionLabel(action), description: '途中播报' }))
    }
  })
  return entries
}

function DemoTaskDispatchDialog({
  open, taskList, dispatched, pending, progress, onClose, onSubmit,
}: {
  open: boolean; taskList?: PlatformTaskList; dispatched: RobotTaskSummary[]; pending: boolean; progress: string
  onClose: () => void; onSubmit: (taskIds: string[]) => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const previousFocus = useRef<HTMLElement | null>(null)
  const tasks = taskList?.items ?? []
  const eligible = tasks.filter((task) => !dispatched.some((item) => item.taskId === task.id && item.taskVersion === task.version))

  useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement as HTMLElement
    setSelected(eligible.map((task) => task.id))
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !pending) onClose() }
    document.addEventListener('keydown', closeOnEscape)
    window.setTimeout(() => document.querySelector<HTMLButtonElement>('.rc-dialog-close')?.focus(), 0)
    return () => { document.removeEventListener('keydown', closeOnEscape); previousFocus.current?.focus() }
  }, [open])

  if (!open) return null
  const toggle = (id: string) => setSelected((value) => value.includes(id) ? value.filter((item) => item !== id) : [...value, id])
  return (
    <div className="rc-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose() }}>
      <section className="rc-dialog" role="dialog" aria-modal="true" aria-labelledby="rc-dispatch-title">
        <header className="rc-dialog-head"><div><h2 id="rc-dispatch-title">下发导览任务</h2><p>下发到机器人后，才能加载地图并开始导览。</p></div><button className="guide-button guide-button-icon rc-dialog-close" type="button" aria-label="关闭" onClick={onClose} disabled={pending}><X size={18} /></button></header>
        {!taskList ? <div className="rc-dialog-empty">正在读取导览任务…</div> : tasks.length === 0 ? <div className="rc-dialog-empty"><strong>暂无可下发的导览任务</strong><span>请先在导览任务中创建任务。</span></div> : (
          <div className="rc-dispatch-list">
            <label className="rc-dispatch-all"><input type="checkbox" checked={eligible.length > 0 && eligible.every((task) => selected.includes(task.id))} onChange={(event) => setSelected(event.target.checked ? eligible.map((task) => task.id) : [])} disabled={pending || eligible.length === 0} />全选<span>{eligible.length} 项可下发</span></label>
            {tasks.map((task) => {
              const old = dispatched.find((item) => item.taskId === task.id)
              const already = old?.taskVersion === task.version
              const checked = already || selected.includes(task.id)
              return <label className={`rc-dispatch-row${already ? ' is-downloaded' : ''}`} key={task.id}><input type="checkbox" checked={checked} disabled={pending || already} onChange={() => toggle(task.id)} /><span className="rc-dispatch-copy"><strong>{task.name}</strong></span>{already ? <span className="rc-downloaded-mark"><Check size={14} />已下发</span> : null}</label>
            })}
          </div>
        )}
        {pending ? <div className="rc-dispatch-progress" role="status"><span className="rc-spinner" />{progress || '任务下发中…'}</div> : null}
        <footer className="rc-dialog-foot"><button className="guide-button guide-button-secondary" type="button" onClick={onClose} disabled={pending}>取消</button><button className="guide-button guide-button-primary" type="button" onClick={() => onSubmit(selected)} disabled={pending || selected.length === 0}>{pending ? '下发中…' : '确定'}</button></footer>
      </section>
    </div>
  )
}

function RobotListPage() {
  const navigate = useNavigate()
  const showToast = useToastStackController()
  const queryClient = useQueryClient()
  const robotsQuery = useQuery({ queryKey: [...robotConsoleQueryKey, 'robots'], queryFn: robotConsoleApi.listRobots, refetchInterval: 5000 })
  const tasksQuery = useQuery({ queryKey: robotPlatformTasksQueryKey, queryFn: robotConsoleApi.listPlatformTasks })
  const [dispatchRobot, setDispatchRobot] = useState<RobotSummary | null>(null)
  const [pending, setPending] = useState(false)
  const [progress, setProgress] = useState('')
  const robotTasksQuery = useQuery({ queryKey: [...robotConsoleQueryKey, dispatchRobot?.id, 'tasks'], queryFn: () => robotConsoleApi.listRobotTasks(dispatchRobot!.id), enabled: Boolean(dispatchRobot) })
  const connectedRobots = (robotsQuery.data ?? []).filter((robot) => robot.connection === 'CONNECTED')

  const onDispatch = async (taskIds: string[]) => {
    if (!dispatchRobot) return
    setPending(true)
    try {
      setProgress('导览任务下发中…')
      const results = await robotConsoleApi.dispatchTasks(dispatchRobot.id, taskIds)
      await queryClient.invalidateQueries({ queryKey: robotConsoleQueryKey })
      showToast({ variant: 'success', title: '下发成功', message: `已向 ${dispatchRobot.name} 下发 ${results.length} 个任务。` })
      setDispatchRobot(null)
    } catch (reason) {
      showToast({ variant: 'error', title: '任务下发失败', message: reason instanceof Error ? reason.message : '请稍后重试。' })
      await queryClient.invalidateQueries({ queryKey: robotConsoleQueryKey })
    } finally { setPending(false); setProgress('') }
  }

  return (
    <section className="page-section rc-robot-list-page" aria-labelledby="robot-list-title">
      <div className="page-heading"><div><h1 id="robot-list-title">机器人</h1><p className="page-summary">管理机器人设备，查看设备状态与实时画面</p></div></div>
      {robotsQuery.isLoading ? <div className="state-panel">正在加载机器人</div> : null}
      {robotsQuery.isError ? <div className="state-panel state-error">无法加载机器人，请稍后重试。</div> : null}
      {robotsQuery.isSuccess && connectedRobots.length === 0 ? <div className="state-panel" role="status">暂无已连接的机器人</div> : null}
      {connectedRobots.length > 0 ? (
        <div className="table-wrap guide-table-scroll">
          <table className="guide-table" aria-label="机器人列表">
            <thead className="guide-table-head">
              <tr className="guide-table-row">
                <th className="guide-table-header-cell" scope="col">机器人</th>
                <th className="guide-table-header-cell" scope="col">电量</th>
                <th className="guide-table-header-cell" scope="col">导览任务</th>
                <th className="guide-table-header-cell guide-table-header-cell-actions actions-column" scope="col">操作</th>
              </tr>
            </thead>
            <tbody className="guide-table-body">
              {connectedRobots.map((robot) => (
                <tr
                  className="guide-table-row guide-table-row-interactive rc-robot-row"
                  key={robot.id}
                  tabIndex={0}
                  aria-label={`查看机器人 ${robot.name}`}
                  onClick={() => navigate(`/robots/${robot.id}`)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      navigate(`/robots/${robot.id}`)
                    }
                  }}
                >
                  <td className="guide-table-cell guide-table-cell-name task-name">{robot.name}</td>
                  <td className="guide-table-cell"><span className="rc-battery"><span className="rc-battery-track" aria-hidden="true"><i style={{ width: `${robot.batteryPercent}%` }} /></span>{robot.batteryPercent}%</span></td>
                  <td className="guide-table-cell">{robot.tourTaskCount} 个任务</td>
                  <td className="guide-table-cell guide-table-cell-actions actions-cell">
                    <div className="rc-row-actions">
                      <button className="guide-button guide-button-icon" type="button" aria-label="下发任务" title="下发任务" disabled={robot.connection !== 'CONNECTED'} onClick={(event) => { event.stopPropagation(); setDispatchRobot(robot) }}><Send aria-hidden="true" size={16} strokeWidth={1.8} /></button>
                      <button className="guide-button guide-button-icon" type="button" aria-label="实时监控" title="实时监控" onClick={(event) => { event.stopPropagation(); navigate(`/robots/${robot.id}`) }}><Monitor aria-hidden="true" size={16} strokeWidth={1.8} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <DemoTaskDispatchDialog open={Boolean(dispatchRobot)} taskList={tasksQuery.data} dispatched={robotTasksQuery.data ?? []} pending={pending} progress={progress} onClose={() => { if (!pending) setDispatchRobot(null) }} onSubmit={onDispatch} />
    </section>
  )
}

function MapCanvas({ task, map, runtime, picking, pickedPosition, onPick, onConfirm, onCancel, disabled }: {
  task: TourTaskDetail; map: MapAssetDetail | null; runtime: RobotRuntimeState
  picking: boolean; pickedPosition: RobotPosition | null; onPick: (position: RobotPosition) => void
  onConfirm: () => void; onCancel: () => void; disabled: boolean
}) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; panX: number; panY: number; rotate: boolean; moved: boolean } | null>(null)
  const dimensions = map?.registration ?? map?.preview
  const width = dimensions?.width ?? 960
  const height = dimensions?.height ?? 500
  const markerScale = Math.max(width / 1000, height / 550)
  const points = task.points
  const route = points.map((point) => `${point.x},${point.y}`).join(' ')
  const current = runtime.position
  const displayImage = map?.preview?.url ? mapPreviewUrl(map.preview.url) : null
  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => { event.preventDefault(); setZoom((value) => Math.max(0.65, Math.min(2.5, value + (event.deltaY < 0 ? 0.1 : -0.1)))) }
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.button !== 2) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y, rotate: event.button === 2, moved: false }
  }
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = drag.current
    if (!start) return
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) start.moved = true
    if (start.rotate) setRotation(Math.max(-65, Math.min(65, rotation + (event.movementX * 0.35))))
    else setPan({ x: start.panX + event.clientX - start.x, y: start.panY + event.clientY - start.y })
  }
  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (picking && !disabled && drag.current && !drag.current.rotate && !drag.current.moved) {
      const rect = event.currentTarget.getBoundingClientRect()
      const radians = -rotation * Math.PI / 180
      const dx = (event.clientX - rect.left - rect.width / 2 - pan.x) / zoom
      const dy = (event.clientY - rect.top - rect.height / 2 - pan.y) / zoom
      const scale = Math.min(rect.width / width, rect.height / height)
      const x = (dx * Math.cos(radians) - dy * Math.sin(radians)) / scale + width / 2
      const y = (dx * Math.sin(radians) + dy * Math.cos(radians)) / scale + height / 2
      if (x >= 0 && x <= width && y >= 0 && y <= height) onPick({ x, y, angle: runtime.position?.angle ?? 0 })
    }
    drag.current = null
  }

  return (
    <><div className="rc-map-shell">
      <div className="rc-map-tools" role="group" aria-label="地图视图控制"><button type="button" className="guide-button guide-button-icon" aria-label="缩小地图" title="缩小" onClick={() => setZoom((value) => Math.max(0.65, value - 0.15))}><ZoomOut size={16} /></button><button type="button" className="guide-button guide-button-icon" aria-label="放大地图" title="放大" onClick={() => setZoom((value) => Math.min(2.5, value + 0.15))}><ZoomIn size={16} /></button><button type="button" className="guide-button guide-button-icon" aria-label="旋转地图" title="旋转" onClick={() => setRotation((value) => value + 15)}><RotateCw size={15} /></button><button type="button" className="guide-button guide-button-icon" aria-label="重置地图视图" title="重置视图" onClick={() => { setZoom(1); setRotation(0); setPan({ x: 0, y: 0 }) }}><RotateCcw size={15} /></button></div>
      <div className={`rc-map-viewport${picking ? ' is-picking' : ''}`} onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { drag.current = null }} onContextMenu={(event) => event.preventDefault()} role="application" aria-label="导览地图，可拖动和缩放">
        <div className="rc-map-layer" style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom}) rotate(${rotation}deg)` }}>
          {displayImage ? <img className="rc-map-image" src={displayImage} alt={`${map?.name ?? task.map.name} 地图`} /> : <svg className="rc-floor-plan" viewBox="0 0 1000 550" preserveAspectRatio="none" aria-hidden="true"><rect x="48" y="42" width="904" height="466" rx="8" /><path d="M48 185H950 M48 324H950 M240 42V185 M515 42V324 M790 185V508 M240 324V508 M515 324V508" /><path d="M95 75h110v76H95z M288 76h178v76H288z M557 76h175v76H557z M824 218h92v86h-92z M85 365h115v102H85z M285 365h170v102H285z M550 365h185v102H550z" /></svg>}
          <svg className="rc-map-overlays" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
            <polyline className="rc-route-line" points={route} style={{ strokeWidth: 5 * markerScale }} />
            {points.map((point, index) => <g className={`rc-route-point${index === 0 ? ' is-start' : ''}`} key={point.id} transform={`translate(${point.x} ${point.y}) scale(${markerScale})`}><path className="rc-point-heading" d="M0 -37L-9 -20H9Z" transform={`rotate(${point.angle})`} /><circle r="16" /><text y="5">{index + 1}</text><text className="rc-route-label" x="22" y="-20">{point.name}{index === 0 ? ' · 起点' : ''}</text></g>)}
            {current ? <g className="rc-robot-marker" transform={`translate(${current.x} ${current.y}) scale(${markerScale})`}><circle className="rc-robot-halo" r="25" /><circle className="rc-robot-core" r="12" /><path className="rc-robot-heading" d="M0 -40L-11 -19H11Z" transform={`rotate(${current.angle})`} /></g> : null}
            {picking && pickedPosition ? <g className="rc-picked-position" transform={`translate(${pickedPosition.x} ${pickedPosition.y}) scale(${markerScale})`}><circle r="22" /><path d="M-30 0H30M0 -30V30" /></g> : null}
          </svg>
        </div>
        {!picking ? <div className="rc-map-scale">左键拖动 · 滚轮缩放 · 右键旋转</div> : null}
      </div>
    </div>
      {picking ? <div className="rc-map-pick-controls"><p role="status">请在地图上标识机器人所在位置</p><div><button type="button" className="guide-button guide-button-secondary" onClick={onCancel}>取消</button><button type="button" className="guide-button guide-button-primary" disabled={!pickedPosition || disabled} onClick={onConfirm}>确定</button></div></div> : null}
    </>
  )
}

function VoicePanel({ robotId, connected, runtime, updateRuntime }: {
  robotId: string; connected: boolean; runtime: RobotRuntimeState; updateRuntime: (patch: Partial<RobotRuntimeState>) => Promise<boolean>
}) {
  const showToast = useToastStackController()

  const toggleTakeover = async () => {
    if (!connected) return
    const nextValue = !runtime.voiceTakeover
    if (!await updateRuntime({ voiceTakeover: nextValue })) return
    showToast({ variant: 'success', title: nextValue ? '语音接管已开始' : '语音接管已结束', message: nextValue ? '导览路线继续执行，自动播报暂停。' : '机器人将恢复自动讲解播报。' })
  }

  return (
    <section className="rc-voice-panel" aria-labelledby="rc-voice-heading">
      <div className="rc-section-title"><h2 id="rc-voice-heading">实时语音控制</h2></div>
      <div className="rc-voice-setting"><label htmlFor={`volume-${robotId}`}>机器人语音音量</label><div className="rc-volume-control"><button type="button" className="guide-button guide-button-icon" aria-label="降低音量" disabled={!connected} onClick={() => void updateRuntime({ volume: Math.max(0, runtime.volume - 5) })}><Minus size={14} /></button><input id={`volume-${robotId}`} type="range" min="0" max="100" step="1" value={runtime.volume} disabled={!connected} onChange={(event) => void updateRuntime({ volume: Number(event.target.value) })} /><button type="button" className="guide-button guide-button-icon" aria-label="提高音量" disabled={!connected} onClick={() => void updateRuntime({ volume: Math.min(100, runtime.volume + 5) })}><Plus size={14} /></button><output>{runtime.volume}%</output></div></div>
      <div className="rc-voice-setting"><span>人工接管音色</span><div className="rc-segmented" role="group" aria-label="人工接管音色"><button type="button" disabled={!connected} aria-pressed={runtime.voice === 'MALE'} className={runtime.voice === 'MALE' ? 'is-selected' : ''} onClick={() => void updateRuntime({ voice: 'MALE' })}>男声</button><button type="button" disabled={!connected} aria-pressed={runtime.voice === 'FEMALE'} className={runtime.voice === 'FEMALE' ? 'is-selected' : ''} onClick={() => void updateRuntime({ voice: 'FEMALE' })}>女声</button></div></div>
      {runtime.voiceTakeover ? <div className="rc-takeover-status" role="status"><span className="rc-pulse" />人工接管中<span className="rc-audio-meter"><i /><i /><i /><i /><i /></span></div> : null}
      <button className={`guide-button ${runtime.voiceTakeover ? 'guide-button-danger' : 'guide-button-primary'} rc-takeover-button`} type="button" onClick={() => void toggleTakeover()} disabled={!connected}><Mic size={16} />{runtime.voiceTakeover ? '停止人工接管' : '开始人工接管'}</button>
    </section>
  )
}

function RobotDetailPage({ robotId }: { robotId: string }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const showToast = useToastStackController()
  const [dispatchOpen, setDispatchOpen] = useState(false)
  const [dispatchPending, setDispatchPending] = useState(false)
  const [dispatchProgress, setDispatchProgress] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<RobotTaskSummary | null>(null)
  const [showFlow, setShowFlow] = useState(false)
  const [cameraClock, setCameraClock] = useState('')
  const [agentStarting, setAgentStarting] = useState(false)
  const [taskLoading, setTaskLoading] = useState(false)
  const [picking, setPicking] = useState(false)
  const [pickedPosition, setPickedPosition] = useState<RobotPosition | null>(null)
  const [relocalizeTrigger, setRelocalizeTrigger] = useState<HTMLElement | null>(null)
  const controlColumn = useRef<HTMLElement | null>(null)
  const tasksQueryKey = [...robotConsoleQueryKey, robotId, 'tasks']
  const robotQuery = useQuery({ queryKey: [...robotConsoleQueryKey, robotId, 'detail'], queryFn: () => robotConsoleApi.getRobot(robotId), refetchInterval: 5000 })
  const tasksQuery = useQuery({ queryKey: robotPlatformTasksQueryKey, queryFn: robotConsoleApi.listPlatformTasks })
  const downloadedQuery = useQuery({ queryKey: tasksQueryKey, queryFn: () => robotConsoleApi.listRobotTasks(robotId) })
  const selectedQuery = useQuery({ queryKey: [...robotConsoleQueryKey, robotId, 'selected'], queryFn: () => robotConsoleApi.getSelectedTask(robotId), enabled: downloadedQuery.isSuccess })
  const robot = robotQuery.data
  const runtime = robot?.runtime
  const selected = selectedQuery.data
  const flow = useMemo(() => selected ? buildFlow(selected.task) : [], [selected])
  const currentFlow = runtime ? flow[runtime.currentFlowIndex] : undefined
  const connected = robot?.connection === 'CONNECTED'
  const activeExecution = runtime?.execution === 'RUNNING' || runtime?.execution === 'PAUSED'
  const showDetail = Boolean(selected && searchParams.get('task') === selected.task.id)

  const refreshState = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [...robotConsoleQueryKey, robotId] }),
      queryClient.invalidateQueries({ queryKey: ['robot-console-demo', 'robots'] }),
    ])
  }, [queryClient, robotId])

  const updateRuntime = useCallback(async (patch: Partial<RobotRuntimeState>) => {
    try { await robotConsoleApi.updateRuntime(robotId, patch); await refreshState(); return true }
    catch (reason) { showToast({ variant: 'error', title: '操作未完成', message: reason instanceof Error ? reason.message : '请检查机器人状态。' }); return false }
  }, [robotId, refreshState, showToast])

  useConfirmModalController({
    open: Boolean(relocalizeTrigger),
    title: '重新定位？',
    description: '确认后将清除当前定位状态，请重新选择一键定位或选点定位。',
    confirmLabel: '确认重新定位',
    trigger: relocalizeTrigger,
    danger: false,
    onConfirm: () => {
      setRelocalizeTrigger(null)
      if (connected && !activeExecution && runtime?.localization === 'LOCALIZED') void updateRuntime({ localization: 'UNLOCALIZED' })
    },
    onCancel: () => setRelocalizeTrigger(null),
  })

  useEffect(() => {
    if (!showDetail || !connected || activeExecution || runtime?.localization !== 'LOCALIZED') setRelocalizeTrigger(null)
  }, [showDetail, connected, activeExecution, runtime?.localization])

  useEffect(() => {
    const updateClock = () => setCameraClock(new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date()))
    updateClock()
    const timer = window.setInterval(updateClock, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!runtime || runtime.execution !== 'RUNNING' || !flow.length) return
    const timer = window.setInterval(() => {
      const index = runtime.currentFlowIndex
      const next = flow[index + 1]
      if (!next) {
        void updateRuntime({ execution: 'ENDED', voiceTakeover: false })
        return
      }
      void updateRuntime({ currentFlowIndex: index + 1, position: next.target })
    }, 4500)
    return () => window.clearInterval(timer)
  }, [runtime?.execution, runtime?.currentFlowIndex, flow, updateRuntime])

  useEffect(() => {
    if (runtime?.localization !== 'LOCALIZING') return
    const startedAt = runtime.localizationRequest?.startedAt
    const remaining = startedAt ? Math.max(0, 60_000 - (Date.now() - startedAt)) : 0
    const timeout = window.setTimeout(() => void updateRuntime({ localization: 'FAILED' }), remaining)
    const timer = window.setTimeout(() => {
      if (startedAt && Date.now() - startedAt >= 60_000) { void updateRuntime({ localization: 'FAILED' }); return }
      if (connected && remaining > 0) {
        void updateRuntime({ localization: 'LOCALIZED' }).then((success) => {
          if (success) showToast({ variant: 'success', title: '定位成功', message: '' })
        })
      }
    }, Math.max(0, 2200 - (Date.now() - (startedAt ?? Date.now()))))
    return () => { window.clearTimeout(timer); window.clearTimeout(timeout) }
  }, [runtime?.localization, runtime?.localizationRequest?.startedAt, connected, updateRuntime, showToast])

  useEffect(() => {
    setShowFlow(false)
    setPicking(false)
    setPickedPosition(null)
    controlColumn.current?.scrollTo({ top: 0 })
  }, [showDetail, selected?.task.id])

  useEffect(() => {
    const handleStateChange = (event: Event) => {
      if ((event as CustomEvent<string>).detail === robotId) void refreshState()
    }
    window.addEventListener('robot-console-state-change', handleStateChange)
    return () => window.removeEventListener('robot-console-state-change', handleStateChange)
  }, [robotId, refreshState])

  const dispatchTasks = async (ids: string[]) => {
    setDispatchPending(true)
    try {
      setDispatchProgress('导览任务下发中…')
      const results = await robotConsoleApi.dispatchTasks(robotId, ids)
      showToast({ variant: 'success', title: '下发成功', message: `已向机器人下发 ${results.length} 个任务。` })
      setDispatchOpen(false)
      await refreshState()
    } catch (reason) {
      showToast({ variant: 'error', title: '任务下发失败', message: reason instanceof Error ? reason.message : '请稍后重试。' })
      await refreshState()
    } finally { setDispatchPending(false); setDispatchProgress('') }
  }

  const selectTask = async (taskId: string) => {
    if (taskLoading) return
    setTaskLoading(true)
    try {
      await robotConsoleApi.selectTask(robotId, taskId)
      await queryClient.invalidateQueries({ queryKey: [...robotConsoleQueryKey, robotId] })
      setSearchParams({ task: taskId })
    } catch (reason) { showToast({ variant: 'error', title: '无法加载任务', message: reason instanceof Error ? reason.message : '请稍后重试。' }) }
    finally { setTaskLoading(false) }
  }

  const toggleConnection = async () => {
    await robotConsoleApi.toggleConnection(robotId)
    if (!connected && runtime?.execution === 'PAUSED') showToast({ variant: 'success', title: '机器人已连接', message: '请检查导览状态后继续操作。' })
    await refreshState()
  }

  const locate = async (target?: RobotPosition) => {
    if (!connected || !selected || activeExecution) return
    try {
      await robotConsoleApi.startLocalization(robotId, target)
      setPicking(false)
      setPickedPosition(null)
      await refreshState()
    } catch (reason) { showToast({ variant: 'error', title: '无法定位', message: reason instanceof Error ? reason.message : '请稍后重试。' }) }
  }

  const startAgent = async () => {
    if (!connected || agentStarting) return
    setAgentStarting(true)
    try {
      await robotConsoleApi.enterTourAgent(robotId)
      await refreshState()
    } catch (reason) {
      showToast({ variant: 'error', title: 'Agent 启动失败', message: reason instanceof Error ? reason.message : '请稍后重试。' })
    } finally { setAgentStarting(false) }
  }

  const runControl = async (command: 'START' | 'PAUSE' | 'RESUME' | 'NEXT' | 'END') => {
    if (!runtime) return
    if (command === 'START') {
      if (runtime.localization !== 'LOCALIZED') return
      if (!robot?.agent || robot.agent !== 'ACTIVE') { showToast({ variant: 'error', title: '导览 Agent 未启动', message: '请先启动导览 Agent。' }); return }
      if (flow.length === 0) { showToast({ variant: 'error', title: '任务流程为空', message: '当前任务没有可执行的导览步骤。' }); return }
      await updateRuntime({ execution: 'RUNNING', currentFlowIndex: 0 })
    } else if (command === 'PAUSE') await updateRuntime({ execution: 'PAUSED' })
    else if (command === 'RESUME') await updateRuntime({ execution: 'RUNNING' })
    else if (command === 'NEXT') {
      const nextIndex = Math.min(flow.length - 1, runtime.currentFlowIndex + 1)
      if (nextIndex >= flow.length - 1 && runtime.currentFlowIndex >= flow.length - 1) await updateRuntime({ execution: 'ENDED' })
      else await updateRuntime({ currentFlowIndex: nextIndex, position: flow[nextIndex]?.target ?? runtime.position })
    } else await updateRuntime({ execution: 'ENDED', voiceTakeover: false })
  }

  const removeDownloadedTask = async () => {
    if (!deleteTarget) return
    try {
      await robotConsoleApi.deleteRobotTask(robotId, deleteTarget.taskId)
      await queryClient.invalidateQueries({ queryKey: [...robotConsoleQueryKey, robotId] })
      showToast({ variant: 'success', title: '任务已移除', message: `${deleteTarget.name} 已从机器人列表删除。` })
    } catch (reason) { showToast({ variant: 'error', title: '删除失败', message: reason instanceof Error ? reason.message : '请稍后重试。' }) }
    setDeleteTarget(null)
  }

  if (robotQuery.isLoading || downloadedQuery.isLoading) return <main className="rc-loading">正在连接机器人控制台…</main>
  if (robotQuery.isError || !robot || !runtime) return <main className="rc-loading is-error"><strong>无法读取机器人</strong><button className="guide-button guide-button-secondary" type="button" onClick={() => navigate('/robots')}>返回机器人列表</button></main>

  const platformTasks = tasksQuery.data?.items ?? []
  const hasTasks = (downloadedQuery.data?.length ?? 0) > 0
  const canStart = Boolean(selected && !picking && robot.agent === 'ACTIVE' && connected && runtime.localization === 'LOCALIZED' && runtime.execution !== 'RUNNING' && runtime.execution !== 'PAUSED')
  const localizationDisabled = !connected || runtime.localization === 'LOCALIZING' || activeExecution
  const currentDescription = runtime.execution === 'RUNNING' && currentFlow ? currentFlow.kind === 'MOVE' ? `正在从 ${currentFlow.description}` : `正在进行 ${currentFlow.pointName} - ${currentFlow.title}` : '导览已暂停'

  return (
    <main className="rc-monitor-page">
      <header className="rc-monitor-header"><div className="rc-monitor-title"><button className="guide-button guide-button-icon" type="button" title="返回机器人列表" aria-label="返回机器人列表" onClick={() => navigate('/robots')}><ArrowLeft size={18} /></button><div><h1>{robot.name}</h1></div></div><div className="rc-header-meta"><button className={`rc-connection rc-connection-button${connected ? ' is-online' : ''}`} type="button" onClick={() => void toggleConnection()} title="切换连接状态"><i />{connected ? '已连接' : '未连接'}</button><span className="rc-header-divider" /><span className="rc-battery-icon"><i style={{ width: `${robot.batteryPercent}%` }} /></span><strong>{robot.batteryPercent}%</strong></div></header>
      {!connected ? <div className="rc-disconnect-banner" role="alert"><Signal size={17} /><span><strong>机器人连接中断</strong><small>任务和地图状态已保留，连接恢复后可以继续操作。</small></span><button className="guide-button guide-button-secondary" type="button" onClick={() => void toggleConnection()}>重新连接</button></div> : null}
      <div className="rc-monitor-layout">
        <aside className="rc-media-column">
          <section className="rc-camera-section" aria-label="机器人摄像头画面">
            <div className="rc-section-title"><h2>实时画面</h2><button className={`guide-button rc-camera-mute ${runtime.muted ? 'guide-button-primary' : 'guide-button-secondary'}`} type="button" aria-pressed={runtime.muted} title={runtime.muted ? '取消静音' : '静音'} disabled={!connected} onClick={() => void updateRuntime({ muted: !runtime.muted })}>静音</button></div>
            <div className={`rc-camera-frame${!connected ? ' is-offline' : ''}`}><img src="/assets/zhengzhou-metro-concourse.jpg" alt="机器人摄像头画面：室内公共空间" /><div className="rc-camera-overlay"><span><i />{connected ? 'LIVE' : 'OFFLINE'}</span><time>{cameraClock}</time></div>{!connected ? <div className="rc-camera-offline"><Signal size={23} /><span>画面连接已中断</span></div> : null}</div>
          </section>
          <VoicePanel robotId={robotId} connected={connected} runtime={runtime} updateRuntime={updateRuntime} />
        </aside>

        <section ref={controlColumn} className={`rc-control-column${robot.agent !== 'ACTIVE' || !hasTasks ? ' is-empty' : ''}`} aria-label="地图和导览任务操控">
          {runtime.localization === 'LOCALIZING' ? <div className="rc-localization-notice" role="status"><span className="rc-spinner" />{runtime.localizationRequest?.mode === 'POINT' ? '定位中，请保持机器人在所选点位附近' : '机器人定位中，请让机器人站在路线起点附近'}</div> : null}
          {robot.agent !== 'ACTIVE' ? <div className="rc-control-placeholder">
            <p>启动导览 Agent 后，即可进行导览相关操控</p>
            <button className="guide-button guide-button-primary" type="button" disabled={!connected || agentStarting} aria-busy={agentStarting} onClick={() => void startAgent()}>{agentStarting ? '启动中…' : '启动导览 Agent'}</button>
          </div> : !hasTasks ? <div className="rc-control-placeholder">
            <p>当前机器人上没有导览任务</p>
            <button className="guide-button guide-button-primary" type="button" disabled={!connected || activeExecution} onClick={() => setDispatchOpen(true)}>下发任务</button>
          </div> : !showDetail ? <section className="rc-task-list-section"><div className="rc-section-title"><h2>导览任务列表 <span className="rc-task-count">{downloadedQuery.data?.length ?? 0}</span></h2><button className="guide-button guide-button-secondary rc-add-task" type="button" disabled={!connected || activeExecution} onClick={() => setDispatchOpen(true)}><Plus aria-hidden="true" size={16} />下发任务</button></div>
            <div className="rc-download-list">{downloadedQuery.data?.map((item) => {
              const latest = platformTasks.find((task) => task.id === item.taskId)
              const outdated = latest && latest.version !== item.taskVersion
              const currentTask = selected?.task.id === item.taskId
              return <div className="rc-downloaded-row" key={item.taskId}><button type="button" className="rc-downloaded-select" disabled={taskLoading || (!currentTask && (!connected || activeExecution || Boolean(outdated)))} onClick={() => void selectTask(item.taskId)}><span><strong>{item.name}</strong><small>{outdated ? '需重新下发' : currentTask && activeExecution ? '当前导览任务' : item.mapName}</small></span><ArrowRight size={16} /></button><button type="button" className="guide-button guide-button-icon rc-remove-task" title={`删除 ${item.name}`} aria-label={`删除 ${item.name}`} disabled={!connected || activeExecution || runtime.localization === 'LOCALIZING'} onClick={() => setDeleteTarget(item)}><Trash2 size={16} /></button></div>
            })}</div>
          </section> : selected ? <>
            <section className="rc-map-section"><div className="rc-section-title"><button className="guide-button guide-button-icon rc-back-tasks" type="button" title="返回任务列表" aria-label="返回任务列表" onClick={() => setSearchParams({})}><ArrowLeft aria-hidden="true" size={18} /></button><h2 title={selected.task.name}>{selected.task.name}</h2></div>
              <MapCanvas key={selected.task.id} task={selected.task} map={selected.map} runtime={runtime} picking={picking} pickedPosition={pickedPosition} onPick={setPickedPosition} onConfirm={() => { if (pickedPosition) void locate(pickedPosition) }} onCancel={() => { setPicking(false); setPickedPosition(null) }} disabled={localizationDisabled} />
              <div className="rc-location-controls">
                <span className={`rc-localization-tag is-${runtime.localization.toLowerCase()}`} role="status"><i />{runtime.localization === 'LOCALIZED' ? '定位正常' : runtime.localization === 'LOCALIZING' ? '定位中' : runtime.localization === 'FAILED' ? '定位失败' : '未定位'}</span>
                <div className="rc-location-actions">
                  {runtime.localization === 'LOCALIZED' ? <button className="guide-button guide-button-icon rc-relocalize" type="button" title="重新定位" aria-label="重新定位" disabled={localizationDisabled} onClick={(event) => setRelocalizeTrigger(event.currentTarget)}><RotateCcw aria-hidden="true" size={16} /></button> : <>
                    <button className="guide-button guide-button-primary" type="button" disabled={localizationDisabled || picking} onClick={() => void locate()}>一键定位</button>
                    <button className="guide-button guide-button-secondary" type="button" disabled={localizationDisabled || picking} onClick={() => { setPickedPosition(null); setPicking(true) }}>选点定位</button>
                  </>}
                </div>
              </div>
            </section>

            <section className="rc-execution-section" aria-label="导览控制">
              {activeExecution ? <p className={`rc-current-state${runtime.execution === 'RUNNING' ? ' is-running' : ''}`} role="status">{runtime.voiceTakeover && runtime.execution === 'RUNNING' && currentFlow?.actionType === 'SPEECH' ? '人工接管中 · 自动播报暂停，路线继续执行' : currentDescription}</p> : null}
              <div className="rc-execution-controls">{runtime.execution === 'RUNNING' ? <><button className="guide-button guide-button-secondary" type="button" disabled={!connected} onClick={() => void runControl('PAUSE')}><Pause size={15} />暂停导览</button><button className="guide-button guide-button-secondary" type="button" disabled={!connected} onClick={() => void runControl('NEXT')}>下一步<ArrowRight size={15} /></button><button className="guide-button guide-button-danger" type="button" disabled={!connected} onClick={() => void runControl('END')}><X size={15} />结束导览</button></> : runtime.execution === 'PAUSED' ? <><button className="guide-button guide-button-primary" type="button" disabled={!connected} onClick={() => void runControl('RESUME')}><Play size={15} />继续导览</button><button className="guide-button guide-button-secondary" type="button" disabled={!connected} onClick={() => void runControl('NEXT')}>下一步<ArrowRight size={15} /></button><button className="guide-button guide-button-danger" type="button" disabled={!connected} onClick={() => void runControl('END')}><X size={15} />结束导览</button></> : <button className="guide-button guide-button-primary" type="button" disabled={!canStart} onClick={() => void runControl('START')}><Play size={15} />开始导览</button>}</div>
              <div className="rc-flow-header"><div><h2>导览流程</h2><span>{flow.length} 个步骤</span></div><button type="button" className="guide-button guide-button-text" aria-expanded={showFlow} aria-controls="rc-tour-flow" onClick={() => setShowFlow((value) => !value)}>{showFlow ? '收起流程' : '展开流程'}<ChevronDown aria-hidden="true" className={showFlow ? 'is-expanded' : ''} size={16} /></button></div>
              {showFlow ? <RobotTourFlow task={selected.task} flow={flow} runtime={runtime} /> : null}
            </section>
          </> : null}
        </section>
      </div>

      <DemoTaskDispatchDialog open={dispatchOpen} taskList={tasksQuery.data} dispatched={downloadedQuery.data ?? []} pending={dispatchPending} progress={dispatchProgress} onClose={() => { if (!dispatchPending) setDispatchOpen(false) }} onSubmit={dispatchTasks} />
      {deleteTarget ? <div className="rc-dialog-backdrop"><section className="rc-dialog rc-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="rc-delete-title"><div className="rc-confirm-icon"><Trash2 size={19} /></div><h2 id="rc-delete-title">从机器人删除任务？</h2><p>“{deleteTarget.name}”将从这台机器人上移除。平台任务不会被删除。</p><footer className="rc-dialog-foot"><button className="guide-button guide-button-secondary" type="button" onClick={() => setDeleteTarget(null)}>取消</button><button className="guide-button guide-button-danger" type="button" onClick={() => void removeDownloadedTask()}>确认删除</button></footer></section></div> : null}
    </main>
  )
}

export function RobotConsolePage() {
  const { robotId } = useParams()
  return robotId ? <RobotDetailPage robotId={robotId} /> : <RobotListPage />
}
