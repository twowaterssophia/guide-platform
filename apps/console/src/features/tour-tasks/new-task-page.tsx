import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowUp, ChevronRight, Flag, GripVertical, MapPinned, MoveRight, Pencil, Plus, Trash2, ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useBeforeUnload, useBlocker, useNavigate, useParams } from 'react-router-dom'
import type { MapAssetDetail, MapAssetSummary, PersonaSummary, SkillSummary, TourTaskDetail, TourTaskUpdateInput, TourTaskWriteInput } from '@guide/contracts'
import { ApiClientError } from '../../api/client'
import { useConfirmModalController, useToastStackController } from '../../ui-adapters'
import { useDismissablePopover } from '../../ui/dismissable-popover'
import { SelectionButton } from '../../ui/selection-button'
import { SelectionDialog } from '../../ui/selection-dialog'
import { SingleSelectPopover } from '../../ui/single-select-popover'
import { getMap, listMaps, mapPreviewUrl, mapsQueryKey } from '../maps/maps-api'
import { listCompatibleSkills, listPersonas, personaQueryKey } from '../personas/personas-api'
import { createTourTask, getTourTask, tourTasksQueryKey, updateTourTask } from './tour-tasks-api'
import { TaskPathTitle, taskPointTitle } from './task-title'

type PointAction =
  | { type: 'SPEECH'; narration: string }
  | { type: 'SKILL'; skillId: string }
  | { type: 'INTERACTION'; interactionPrompt?: string }
type PathAction =
  | { type: 'SPEECH'; narration: string }
  | { type: 'INTERACTION'; interactionPrompt?: string }
type DraftPoint = { key: string; name: string; x: number; y: number; angle: number; actions: PointAction[] }
type DraftPath = { fromPointKey: string; toPointKey: string; actions: PathAction[] }
type TaskDraft = { name: string; mapId: string; personaId: string | null; points: DraftPoint[]; paths: DraftPath[] }

const emptyDraft: TaskDraft = { name: '', mapId: '', personaId: null, points: [], paths: [] }
const actionLabels = { SPEECH: '语音播报', SKILL: '执行技能', INTERACTION: '语音问答' } as const
const fallbackMapDimensions = { width: 960, height: 500 }

function getMapDimensions(map: Pick<MapAssetDetail, 'registration'> | undefined) {
  const registration = map?.registration
  if (!registration || registration.width <= 1 || registration.height <= 1) return fallbackMapDimensions
  return { width: registration.width, height: registration.height }
}

export function detailToDraft(task: TourTaskDetail): TaskDraft {
  const points = task.points.map((point) => ({
    key: `point-${point.id}`,
    name: point.name,
    x: point.x,
    y: point.y,
    angle: point.angle,
    actions: point.actions.map((action): PointAction => action.type === 'SPEECH'
      ? { type: 'SPEECH', narration: action.narration }
      : action.type === 'SKILL'
        ? { type: 'SKILL', skillId: action.skillId }
        : { type: 'INTERACTION', interactionPrompt: action.interactionPrompt ?? undefined }),
  }))
  const pointKeys = new Map(task.points.map((point, index) => [point.id, points[index]!.key]))
  return {
    name: task.name,
    mapId: task.map.id,
    personaId: task.persona?.id ?? null,
    points,
    // Older tasks may not have persisted empty paths. The editor always needs one
    // path for every pair of adjacent points because the API validates that invariant.
    paths: task.points.slice(0, -1).map((point, index) => {
      const nextPoint = task.points[index + 1]!
      const path = task.paths.find((item) => item.fromPointId === point.id && item.toPointId === nextPoint.id)
      return {
        fromPointKey: pointKeys.get(point.id) ?? '',
        toPointKey: pointKeys.get(nextPoint.id) ?? '',
        actions: path?.actions.map((action): PathAction => action.type === 'SPEECH'
          ? { type: 'SPEECH', narration: action.narration }
          : { type: 'INTERACTION', interactionPrompt: action.interactionPrompt ?? undefined }) ?? [],
      }
    }),
  }
}

export function draftToInput(draft: TaskDraft): TourTaskWriteInput {
  return {
    name: draft.name.trim(),
    mapId: draft.mapId,
    personaId: draft.personaId,
    points: draft.points.map((point) => ({
      key: point.key,
      name: point.name.trim(),
      x: point.x,
      y: point.y,
      angle: point.angle,
      actions: point.actions.map((action) => action.type === 'SPEECH'
        ? { type: 'SPEECH' as const, narration: action.narration.trim() }
        : action.type === 'SKILL'
          ? { type: 'SKILL' as const, skillId: action.skillId }
          : { type: 'INTERACTION' as const, interactionPrompt: action.interactionPrompt?.trim() || undefined }),
    })),
    paths: draft.points.slice(0, -1).map((point, index) => {
      const nextPoint = draft.points[index + 1]!
      const path = draft.paths.find((item) => item.fromPointKey === point.key && item.toPointKey === nextPoint.key)
      return {
        fromPointKey: point.key,
        toPointKey: nextPoint.key,
        actions: (path?.actions ?? []).map((action) => action.type === 'SPEECH'
          ? { type: 'SPEECH' as const, narration: action.narration.trim() }
          : { type: 'INTERACTION' as const, interactionPrompt: action.interactionPrompt?.trim() || undefined }),
      }
    }),
  }
}

function sameDraft(left: TaskDraft, right: TaskDraft) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function PersonaPicker({ personas, value, onChange }: { personas: PersonaSummary[]; value: string | null; onChange: (value: string | null) => void }) {
  const defaultPersonaId = personas.find((persona) => persona.isSystemDefault)?.id ?? null
  return <SingleSelectPopover options={personas.map((persona) => ({ value: persona.id, label: persona.isSystemDefault ? '默认' : persona.name }))} value={value ?? defaultPersonaId} onChange={onChange} placeholder="默认" ariaLabel="选择语音人设" className="task-persona-picker" triggerClassName="task-persona-trigger" />
}

function MapPicker({ maps, value, loading, error, disabled, onChange }: { maps: MapAssetSummary[]; value: string; loading: boolean; error: boolean; disabled: boolean; onChange: (mapId: string) => void }) {
  return <SingleSelectPopover options={maps.map((map) => ({ value: map.id, label: map.name }))} value={value || null} onChange={onChange} placeholder={error ? '无法加载地图' : '请选择地图'} ariaLabel={`地图，${maps.find((map) => map.id === value)?.name ?? (error ? '无法加载地图' : '请选择地图')}`} emptyMessage="暂无可用地图" disabled={loading || disabled} className="task-map-picker" triggerClassName="task-map-trigger" placeholderClassName={!error ? 'is-placeholder' : ''} />
}

function PointMapCanvas({ map, points, addMode, scale, onAddPoint, onMovePoint, onRotatePoint, onZoomIn, onZoomOut }: {
  map: Awaited<ReturnType<typeof getMap>> | undefined
  points: DraftPoint[]
  addMode: boolean
  scale: number
  onAddPoint: (x: number, y: number) => void
  onMovePoint: (key: string, x: number, y: number) => void
  onRotatePoint: (key: string, angle: number) => void
  onZoomIn: () => void
  onZoomOut: () => void
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [movingPointKey, setMovingPointKey] = useState<string | null>(null)
  const [rotatingPointKey, setRotatingPointKey] = useState<string | null>(null)
  const mapDimensions = getMapDimensions(map)
  const mapStyle = { aspectRatio: `${mapDimensions.width} / ${mapDimensions.height}`, maxWidth: mapDimensions.width === mapDimensions.height ? 720 : undefined }
  const updatePointer = (event: ReactPointerEvent<HTMLDivElement>, key: string) => {
    const bounds = viewportRef.current?.getBoundingClientRect()
    if (!bounds) return
    const x = (event.clientX - bounds.left - bounds.width / 2) / scale + bounds.width / 2
    const y = (event.clientY - bounds.top - bounds.height / 2) / scale + bounds.height / 2
    onMovePoint(key, clamp(Math.round((x / bounds.width) * mapDimensions.width), 0, mapDimensions.width), clamp(Math.round((y / bounds.height) * mapDimensions.height), 0, mapDimensions.height))
  }
  const updateAngle = (event: ReactPointerEvent<HTMLDivElement>, key: string) => {
    const bounds = viewportRef.current?.getBoundingClientRect()
    const point = points.find((item) => item.key === key)
    if (!bounds || !point) return
    const centerX = bounds.left + bounds.width / 2 + ((point.x / mapDimensions.width) - 0.5) * bounds.width * scale
    const centerY = bounds.top + bounds.height / 2 + ((point.y / mapDimensions.height) - 0.5) * bounds.height * scale
    const angle = (Math.atan2(event.clientX - centerX, centerY - event.clientY) * 180 / Math.PI + 360) % 360
    onRotatePoint(key, Math.round(angle) % 360)
  }
  return <div ref={viewportRef} className={`task-map-canvas${addMode ? ' is-adding' : ''}`} style={mapStyle} onPointerMove={(event) => { if (movingPointKey) updatePointer(event, movingPointKey); if (rotatingPointKey) updateAngle(event, rotatingPointKey) }} onPointerUp={() => { setMovingPointKey(null); setRotatingPointKey(null) }} onPointerCancel={() => { setMovingPointKey(null); setRotatingPointKey(null) }} onClick={(event) => {
    if (!addMode || (event.target as HTMLElement).closest('button')) return
    const bounds = viewportRef.current?.getBoundingClientRect()
    if (!bounds) return
    const x = (event.clientX - bounds.left - bounds.width / 2) / scale + bounds.width / 2
    const y = (event.clientY - bounds.top - bounds.height / 2) / scale + bounds.height / 2
    onAddPoint(clamp(Math.round((x / bounds.width) * mapDimensions.width), 0, mapDimensions.width), clamp(Math.round((y / bounds.height) * mapDimensions.height), 0, mapDimensions.height))
  }}>
    <div className="task-map-canvas-stage" style={{ transform: `scale(${scale})` }}>{map?.preview ? <img className="task-map-canvas-image" src={mapPreviewUrl(map.preview.url)} alt={`${map.name} 二维地图`} /> : <div className="task-map-canvas-empty"><MapPinned aria-hidden="true" size={28} /><span>{map ? '该地图没有可用二维预览，仍可用坐标编辑点位' : '正在加载地图预览'}</span></div>}{points.map((point, index) => <div key={point.key} className="task-map-point" style={{ left: `${(point.x / mapDimensions.width) * 100}%`, top: `${(point.y / mapDimensions.height) * 100}%` }}><button type="button" className="task-map-point-marker" aria-label={`${point.name || `点位 ${index + 1}`}，拖动调整位置`} onPointerDown={(event) => { event.stopPropagation(); setMovingPointKey(point.key); event.currentTarget.setPointerCapture?.(event.pointerId) }} onClick={(event) => event.stopPropagation()}><span>{index + 1}</span></button><span className="task-map-point-direction-orbit" style={{ transform: `rotate(${point.angle}deg)` }}><button type="button" className="task-map-point-direction" aria-label={`${point.name || `点位 ${index + 1}`}，拖动调整朝向`} title="拖动调整朝向" onPointerDown={(event) => { event.stopPropagation(); setRotatingPointKey(point.key); event.currentTarget.setPointerCapture?.(event.pointerId) }} onClick={(event) => event.stopPropagation()}><ArrowUp aria-hidden="true" size={16} strokeWidth={2.4} /></button></span></div>)}</div>
    <div className="task-map-zoom-controls" aria-label="地图缩放"><button className="guide-button guide-button-icon" type="button" aria-label="放大地图" title="放大地图" onClick={onZoomIn}><ZoomIn aria-hidden="true" size={16} /></button><button className="guide-button guide-button-icon" type="button" aria-label="缩小地图" title="缩小地图" onClick={onZoomOut}><ZoomOut aria-hidden="true" size={16} /></button></div>
  </div>
}

function SortablePointRow({ point, index, dragging, dropTarget, mapDimensions, onChange, onRemove, onDragStart, onDragEnter, onDrop, onDragEnd }: { point: DraftPoint; index: number; dragging: boolean; dropTarget: boolean; mapDimensions: { width: number; height: number }; onChange: (key: string, change: Partial<DraftPoint>) => void; onRemove: (key: string) => void; onDragStart: (key: string) => void; onDragEnter: (key: string) => void; onDrop: () => void; onDragEnd: () => void }) {
  return <article className={`task-point-edit-row${dragging ? ' is-sorting' : ''}${dropTarget ? ' is-drop-target' : ''}`} onDragOver={(event) => event.preventDefault()} onDragEnter={() => onDragEnter(point.key)} onDrop={(event) => { event.preventDefault(); onDrop() }}><button draggable className="guide-button guide-button-icon task-point-drag" type="button" aria-label={`拖动调整 ${point.name} 顺序`} title="拖动排序" onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', point.key); onDragStart(point.key) }} onDragEnd={onDragEnd}><GripVertical aria-hidden="true" size={17} /></button><span className="point-index">{index + 1}</span><input aria-label="点位名称" value={point.name} onChange={(event) => onChange(point.key, { name: event.target.value })} /><input aria-label="X" type="number" min="0" max={mapDimensions.width} value={point.x} onChange={(event) => onChange(point.key, { x: clamp(Number(event.target.value) || 0, 0, mapDimensions.width) })} /><input aria-label="Y" type="number" min="0" max={mapDimensions.height} value={point.y} onChange={(event) => onChange(point.key, { y: clamp(Number(event.target.value) || 0, 0, mapDimensions.height) })} /><input aria-label="朝向" type="number" min="0" max="359" value={point.angle} onChange={(event) => onChange(point.key, { angle: clamp(Number(event.target.value) || 0, 0, 359) })} /><button className="guide-button guide-button-icon" type="button" aria-label={`删除 ${point.name}`} title="删除点位" onClick={() => onRemove(point.key)}><Trash2 aria-hidden="true" size={16} /></button></article>
}

function ActionTypeMenu({ target, onAdd, onSelectSkill }: { target: 'point' | 'path'; onAdd: (type: PointAction['type']) => void; onSelectSkill: (trigger: HTMLButtonElement) => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismissablePopover({ open, rootRef, triggerRef, onClose: close })
  const options: PointAction['type'][] = target === 'path' ? ['SPEECH', 'INTERACTION'] : ['SPEECH', 'INTERACTION', 'SKILL']
  return <div className="task-action-menu" ref={rootRef}><button ref={triggerRef} className="guide-button guide-button-text" type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}><Plus aria-hidden="true" size={15} />添加任务</button>{open ? <div className="task-action-menu-content" role="menu" aria-label="选择任务类型">{options.map((type) => <button key={type} type="button" role="menuitem" onClick={(event) => { setOpen(false); if (type === 'SKILL') onSelectSkill(event.currentTarget); else onAdd(type) }}>{actionLabels[type]}</button>)}</div> : null}</div>
}

function ActionEditor({ action, skills, onChange, onDelete, onDragStart, onDragEnd, onDrop }: { action: PointAction | PathAction; skills: SkillSummary[]; onChange: (action: PointAction | PathAction) => void; onDelete: () => void; onDragStart: () => void; onDragEnd: () => void; onDrop: () => void }) {
  const [skillOpen, setSkillOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const selectedSkill = action.type === 'SKILL' ? skills.find((skill) => skill.id === action.skillId) : null
  const skillOptions = skills.map((skill) => ({ id: skill.id, label: skill.name, group: skill.source === 'official' ? '官方技能' : '云端技能' }))
  return <div className="task-edit-action-row"><button draggable className="guide-button guide-button-icon task-action-drag" type="button" aria-label={`拖动调整${actionLabels[action.type]}顺序`} title="拖动排序" onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', action.type); onDragStart() }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onDrop() }} onDragEnd={onDragEnd}><GripVertical aria-hidden="true" size={16} /></button><span className="task-action-type-label">{actionLabels[action.type]}</span><div className="task-action-editor-field">{action.type === 'SPEECH' ? <textarea aria-label="语音播报内容" rows={1} value={action.narration} placeholder="请输入播报内容" onChange={(event) => onChange({ ...action, narration: event.target.value })} /> : action.type === 'INTERACTION' ? <input aria-label="语音问答内容" value={action.interactionPrompt ?? ''} placeholder="可选：请输入提问引导" onChange={(event) => onChange({ ...action, interactionPrompt: event.target.value })} /> : <div className="task-skill-picker">{selectedSkill ? <span className="task-skill-selection"><strong>{selectedSkill.name}</strong></span> : null}<SelectionButton ref={triggerRef} className={selectedSkill ? 'task-skill-trigger task-skill-change-button guide-button-icon' : 'task-skill-trigger'} aria-label={selectedSkill ? '更换技能' : undefined} title={selectedSkill ? '更换技能' : undefined} aria-haspopup="dialog" aria-expanded={skillOpen} onClick={() => setSkillOpen(true)}>{selectedSkill ? <Pencil aria-hidden="true" size={15} /> : '选择技能'}</SelectionButton><SelectionDialog open={skillOpen} title="选择技能" mode="single" options={skillOptions} value={action.type === 'SKILL' ? [action.skillId] : []} trigger={triggerRef.current} emptyMessage="暂无可用技能" requireSelection onConfirm={(skillIds) => { const skillId = skillIds[0]; if (!skillId) return; onChange({ type: 'SKILL', skillId }); setSkillOpen(false) }} onClose={() => setSkillOpen(false)} /></div>}</div><button className="guide-button guide-button-icon" type="button" aria-label={`删除${actionLabels[action.type]}`} title="删除任务" onClick={onDelete}><Trash2 aria-hidden="true" size={15} /></button></div>
}

export function NewTaskPage() {
  const navigate = useNavigate()
  const { taskId } = useParams()
  const queryClient = useQueryClient()
  const showToast = useToastStackController()
  const isEditing = Boolean(taskId)
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft)
  const [initialDraft, setInitialDraft] = useState<TaskDraft>(emptyDraft)
  const [addPointMode, setAddPointMode] = useState(false)
  const [scale, setScale] = useState(1)
  const [draggingPointKey, setDraggingPointKey] = useState<string | null>(null)
  const [pointDropTargetKey, setPointDropTargetKey] = useState<string | null>(null)
  const [dragAction, setDragAction] = useState<{ target: 'point' | 'path'; key: string; index: number } | null>(null)
  const [pendingSkillAction, setPendingSkillAction] = useState<{ target: 'point'; key: string; trigger: HTMLButtonElement } | null>(null)
  const [error, setError] = useState('')
  const skipBlockRef = useRef(false)
  const mapsQuery = useQuery({ queryKey: mapsQueryKey, queryFn: listMaps })
  const personasQuery = useQuery({ queryKey: personaQueryKey, queryFn: listPersonas })
  const skillsQuery = useQuery({ queryKey: ['skills', 'compatible'], queryFn: listCompatibleSkills })
  const detailQuery = useQuery({ queryKey: [...tourTasksQueryKey, taskId], queryFn: () => getTourTask(taskId ?? ''), enabled: isEditing })
  const mapQuery = useQuery({ queryKey: [...mapsQueryKey, draft.mapId], queryFn: () => getMap(draft.mapId), enabled: step === 2 && Boolean(draft.mapId) })

  useEffect(() => { if (detailQuery.data) { const next = detailToDraft(detailQuery.data); setDraft(next); setInitialDraft(next) } }, [detailQuery.data])
  const hasVoiceTask = draft.points.some((point) => point.actions.some((action) => action.type === 'SPEECH' || action.type === 'INTERACTION'))
    || draft.paths.some((path) => path.actions.some((action) => action.type === 'SPEECH' || action.type === 'INTERACTION'))
  useEffect(() => {
    if (isEditing || !hasVoiceTask || draft.personaId || !personasQuery.data) return
    const defaultPersona = personasQuery.data.items.find((persona) => persona.isSystemDefault)
    if (defaultPersona) setDraft((current) => ({ ...current, personaId: defaultPersona.id }))
  }, [draft.personaId, hasVoiceTask, isEditing, personasQuery.data])
  const isDirty = !sameDraft(draft, initialDraft)
  const blocker = useBlocker(useCallback(() => isDirty && !skipBlockRef.current, [isDirty]))
  useBeforeUnload(useCallback((event) => { if (isDirty) { event.preventDefault(); event.returnValue = '' } }, [isDirty]))
  useConfirmModalController({ open: blocker.state === 'blocked', title: '放弃未保存的修改？', description: '离开后，本次填写的任务内容不会被保存。', confirmLabel: '放弃修改', cancelLabel: '继续编辑', onConfirm: () => blocker.proceed?.(), onCancel: () => blocker.reset?.() })

  const mutation = useMutation({
    mutationFn: async () => {
      const input = draftToInput(draft)
      if (isEditing && detailQuery.data) return updateTourTask(taskId!, { ...input, expectedVersion: detailQuery.data.version } as TourTaskUpdateInput)
      return createTourTask(input)
    },
    onSuccess: async (task) => { await queryClient.invalidateQueries({ queryKey: tourTasksQueryKey }); queryClient.setQueryData([...tourTasksQueryKey, task.id], task); skipBlockRef.current = true; showToast({ variant: 'success', title: '任务已保存', message: '导览任务编排已保存。' }); navigate(`/tour-tasks/${task.id}`, { replace: true }) },
    onError: (reason) => setError(reason instanceof ApiClientError && reason.status === 409 ? '任务已被其他会话更新，请返回详情后刷新再试。' : '保存失败，请检查填写内容后重试。'),
  })

  const maps = mapsQuery.data?.items ?? []
  const personas = personasQuery.data?.items ?? []
  const skills = skillsQuery.data ?? []
  const activeMapDimensions = getMapDimensions(mapQuery.data)
  const canContinueBasic = Boolean(draft.name.trim() && draft.mapId)
  const canContinuePoints = draft.points.length > 0 && draft.points.every((point) => point.name.trim())
  const hasInvalidActions = draft.points.some((point) => point.actions.some((action) => (action.type === 'SPEECH' && !action.narration.trim()) || (action.type === 'SKILL' && !action.skillId))) || draft.paths.some((path) => path.actions.some((action) => action.type === 'SPEECH' && !action.narration.trim()))
  const updateDraft = (change: (current: TaskDraft) => TaskDraft) => setDraft((current) => change(current))
  const rebuildPaths = (points: DraftPoint[], current: DraftPath[]) => points.slice(0, -1).map((point, index) => { const next = points[index + 1]!; return current.find((path) => path.fromPointKey === point.key && path.toPointKey === next.key) ?? { fromPointKey: point.key, toPointKey: next.key, actions: [] } })
  const addPoint = (x: number, y: number) => { updateDraft((current) => { const key = `point-${Date.now()}-${current.points.length}`; const points = [...current.points, { key, name: `点位 ${current.points.length + 1}`, x, y, angle: 0, actions: [] }]; return { ...current, points, paths: rebuildPaths(points, current.paths) } }); setAddPointMode(false) }
  const removePoint = (key: string) => updateDraft((current) => { const points = current.points.filter((point) => point.key !== key); return { ...current, points, paths: rebuildPaths(points, current.paths) } })
  const updatePoint = (key: string, change: Partial<DraftPoint>) => updateDraft((current) => ({ ...current, points: current.points.map((point) => point.key === key ? { ...point, ...change } : point) }))
  const reorderPoint = (sourceKey: string, targetKey: string) => updateDraft((current) => { const source = current.points.find((point) => point.key === sourceKey); if (!source || sourceKey === targetKey) return current; const points = current.points.filter((point) => point.key !== sourceKey); const targetIndex = points.findIndex((point) => point.key === targetKey); points.splice(targetIndex < 0 ? points.length : targetIndex, 0, source); return { ...current, points, paths: rebuildPaths(points, current.paths) } })
  const handlePointDragEnter = (targetKey: string) => {
    setPointDropTargetKey(targetKey)
    if (draggingPointKey && draggingPointKey !== targetKey) reorderPoint(draggingPointKey, targetKey)
  }
  const clearPointDrag = () => { setDraggingPointKey(null); setPointDropTargetKey(null) }
  const addAction = (target: 'point' | 'path', key: string, type: PointAction['type'], skillId?: string) => updateDraft((current) => target === 'point' ? { ...current, points: current.points.map((point) => point.key === key ? { ...point, actions: [...point.actions, type === 'SPEECH' ? { type, narration: '' } : type === 'SKILL' && skillId ? { type, skillId } : { type: 'INTERACTION' as const, interactionPrompt: '' }] } : point) } : { ...current, paths: current.paths.map((path) => `${path.fromPointKey}-${path.toPointKey}` === key ? { ...path, actions: [...path.actions, type === 'SPEECH' ? { type, narration: '' } : { type: 'INTERACTION' as const, interactionPrompt: '' }] } : path) })
  const updateAction = (target: 'point' | 'path', key: string, index: number, action: PointAction | PathAction) => updateDraft((current) => target === 'point' ? { ...current, points: current.points.map((point) => point.key === key ? { ...point, actions: point.actions.map((item, itemIndex) => itemIndex === index ? action as PointAction : item) } : point) } : { ...current, paths: current.paths.map((path) => `${path.fromPointKey}-${path.toPointKey}` === key ? { ...path, actions: path.actions.map((item, itemIndex) => itemIndex === index ? action as PathAction : item) } : path) })
  const removeAction = (target: 'point' | 'path', key: string, index: number) => updateDraft((current) => target === 'point' ? { ...current, points: current.points.map((point) => point.key === key ? { ...point, actions: point.actions.filter((_, itemIndex) => itemIndex !== index) } : point) } : { ...current, paths: current.paths.map((path) => `${path.fromPointKey}-${path.toPointKey}` === key ? { ...path, actions: path.actions.filter((_, itemIndex) => itemIndex !== index) } : path) })
  const reorderAction = (target: 'point' | 'path', key: string, targetIndex: number) => updateDraft((current) => {
    if (!dragAction || dragAction.target !== target || dragAction.key !== key || dragAction.index === targetIndex) return current
    const move = (actions: Array<PointAction | PathAction>) => {
      const next = [...actions]
      const [item] = next.splice(dragAction.index, 1)
      if (item) next.splice(targetIndex, 0, item)
      return next
    }
    return target === 'point'
      ? { ...current, points: current.points.map((point) => point.key === key ? { ...point, actions: move(point.actions) as PointAction[] } : point) }
      : { ...current, paths: current.paths.map((path) => `${path.fromPointKey}-${path.toPointKey}` === key ? { ...path, actions: move(path.actions) as PathAction[] } : path) }
  })

  if (isEditing && detailQuery.isLoading) return <section className="page-section"><div className="state-panel">正在加载任务编辑器</div></section>
  if (isEditing && (detailQuery.isError || !detailQuery.data)) return <section className="page-section"><div className="state-panel state-error">无法加载该任务，请返回详情后重试。</div></section>

  return <section className="page-section task-editor-page" aria-labelledby="new-task-title">
    <div className="page-heading"><div><button className="guide-button guide-button-text editor-back" type="button" onClick={() => navigate(isEditing ? `/tour-tasks/${taskId}` : '/tour-tasks')}><ArrowLeft aria-hidden="true" size={16} />{isEditing ? '返回任务详情' : '返回任务列表'}</button><h1 id="new-task-title">{isEditing ? '编辑导览任务' : '新建导览任务'}</h1></div></div>
    <ol className="editor-stepper" aria-label="任务编辑步骤">{['基本信息', '配置点位', '设置任务'].map((label, index) => { const number = index + 1; return <li className={`editor-step${step === number ? ' is-current' : ''}`} key={label}><button type="button" disabled={number > step} onClick={() => number < step && setStep(number)} aria-current={step === number ? 'step' : undefined}><span className="editor-step-number">{number}</span><span>{label}</span></button>{number < 3 ? <ChevronRight className="editor-step-divider" aria-hidden="true" size={16} /> : null}</li> })}</ol>
    <div className="editor-card task-editor-card">
      {step === 1 ? (
        <div className="editor-panel" aria-labelledby="editor-step-title">
          <h2 id="editor-step-title">基本信息</h2>
          <p className="editor-help">先填写名称，并选择地图。</p>
          <div className="editor-form-grid">
            <label className="editor-field">
              <span>名称</span>
              <input aria-label="任务名称" value={draft.name} maxLength={120} onChange={(event) => updateDraft((current) => ({ ...current, name: event.target.value }))} placeholder="请输入导览任务名称" />
            </label>
            <div className="editor-field">
              <span id="task-map-label">{isEditing ? '地图' : '选择地图'}</span>
              <MapPicker maps={maps} value={draft.mapId} loading={mapsQuery.isLoading} error={mapsQuery.isError} disabled={isEditing} onChange={(mapId) => updateDraft((current) => ({ ...current, mapId }))} />
              {isEditing ? <small className="task-field-hint">已有任务的地图不可更换，以免点位坐标失效。</small> : null}
            </div>
          </div>
        </div>
      ) : null}
      {step === 2 ? <div className="editor-panel task-points-panel" aria-labelledby="editor-step-title">
        <div className="editor-panel-heading"><div><h2 id="editor-step-title">配置点位</h2><p className="editor-help">在地图上点击添加点位，也可以拖动标记或直接编辑坐标与朝向。机器人将按点位顺序依次移动。</p></div><div className="task-map-tools"><button className={`guide-button guide-button-primary${addPointMode ? ' is-active' : ''}`} type="button" onClick={() => setAddPointMode((value) => !value)}><Plus aria-hidden="true" size={16} />{addPointMode ? '取消添加' : '添加点位'}</button></div></div>
        <PointMapCanvas map={mapQuery.data} points={draft.points} addMode={addPointMode} scale={scale} onAddPoint={addPoint} onMovePoint={(key, x, y) => updatePoint(key, { x, y })} onRotatePoint={(key, angle) => updatePoint(key, { angle })} onZoomIn={() => setScale((value) => clamp(Number((value + 0.15).toFixed(2)), 0.7, 2.5))} onZoomOut={() => setScale((value) => clamp(Number((value - 0.15).toFixed(2)), 0.7, 2.5))} />
        <div className="task-point-list-heading"><h3>点位列表</h3><span>{draft.points.length} 个点位</span></div>
        <div className="task-point-edit-table">{draft.points.length === 0 ? <div className="task-point-empty">暂无点位</div> : <><div className="task-point-edit-header" aria-hidden="true"><span /><span>序号</span><span>名称</span><span>X 坐标</span><span>Y 坐标</span><span>朝向</span><span>操作</span></div><div className="task-point-edit-list" role="list" aria-label="点位列表">{draft.points.map((point, index) => <SortablePointRow key={point.key} point={point} index={index} dragging={point.key === draggingPointKey} dropTarget={point.key === pointDropTargetKey && point.key !== draggingPointKey} mapDimensions={activeMapDimensions} onChange={updatePoint} onRemove={removePoint} onDragStart={(key) => setDraggingPointKey(key)} onDragEnter={handlePointDragEnter} onDrop={clearPointDrag} onDragEnd={clearPointDrag} />)}</div></>}</div>
      </div> : null}
      {step === 3 ? <><div className="editor-panel task-actions-panel" aria-labelledby="editor-step-title"><div><h2 id="editor-step-title">设置任务</h2><p className="editor-help">分别设置抵达点位后和点位之间的任务。</p></div><div className="task-action-sections">{draft.points.flatMap((point, index) => { const pointTitle = taskPointTitle(point.name, `点位 ${index + 1}`); const pointSection = <div className="task-action-section" key={`point-${point.key}`}><div className="task-action-section-heading"><div className="task-action-section-title"><Flag aria-hidden="true" size={18} /><div><h3>{pointTitle}</h3><p>机器人到达点位时按顺序执行。</p></div></div><ActionTypeMenu target="point" onAdd={(type) => addAction('point', point.key, type)} onSelectSkill={(trigger) => setPendingSkillAction({ target: 'point', key: point.key, trigger })} /></div>{point.actions.map((action, actionIndex) => <ActionEditor key={`${point.key}-${actionIndex}`} action={action} skills={skills} onChange={(next) => updateAction('point', point.key, actionIndex, next)} onDelete={() => removeAction('point', point.key, actionIndex)} onDragStart={() => setDragAction({ target: 'point', key: point.key, index: actionIndex })} onDragEnd={() => setDragAction(null)} onDrop={() => { reorderAction('point', point.key, actionIndex); setDragAction(null) }} />)}</div>; if (index === draft.points.length - 1) return [pointSection]; const next = draft.points[index + 1]!; const path = draft.paths.find((item) => item.fromPointKey === point.key && item.toPointKey === next.key); if (!path) return [pointSection]; const nextTitle = taskPointTitle(next.name, `点位 ${index + 2}`); const pathKey = `${path.fromPointKey}-${path.toPointKey}`; return [pointSection, <div className="task-action-section task-action-path" key={`path-${pathKey}`}><div className="task-action-section-heading"><div className="task-action-section-title"><MoveRight aria-hidden="true" size={18} /><div><TaskPathTitle from={pointTitle} to={nextTitle} /><p>机器人前往下一个点位时按顺序执行。</p></div></div><ActionTypeMenu target="path" onAdd={(type) => addAction('path', pathKey, type)} onSelectSkill={() => undefined} /></div>{path.actions.map((action, actionIndex) => <ActionEditor key={`${pathKey}-${actionIndex}`} action={action} skills={skills} onChange={(nextAction) => updateAction('path', pathKey, actionIndex, nextAction)} onDelete={() => removeAction('path', pathKey, actionIndex)} onDragStart={() => setDragAction({ target: 'path', key: pathKey, index: actionIndex })} onDragEnd={() => setDragAction(null)} onDrop={() => { reorderAction('path', pathKey, actionIndex); setDragAction(null) }} />)}</div>] })}</div></div>{hasVoiceTask ? <div className="editor-panel task-persona-panel"><h2 id="task-persona-label">选择语音人设</h2><div className="editor-field"><PersonaPicker personas={personas} value={draft.personaId} onChange={(personaId) => updateDraft((current) => ({ ...current, personaId }))} /></div></div> : null}<SelectionDialog open={Boolean(pendingSkillAction)} title="选择技能" mode="single" options={skills.map((skill) => ({ id: skill.id, label: skill.name, group: skill.source === 'official' ? '官方技能' : '云端技能' }))} value={[]} trigger={pendingSkillAction?.trigger ?? null} emptyMessage="暂无可用技能" requireSelection onConfirm={(skillIds) => { const skillId = skillIds[0]; if (!pendingSkillAction || !skillId) return; addAction(pendingSkillAction.target, pendingSkillAction.key, 'SKILL', skillId); setPendingSkillAction(null) }} onClose={() => setPendingSkillAction(null)} /></> : null}
      {error || mutation.isError ? <p className="editor-form-error" role="alert">{error || '保存失败，请检查填写内容后重试。'}</p> : null}
      <footer className="editor-actions"><button className="guide-button guide-button-secondary editor-action-button" type="button" onClick={() => step === 1 ? navigate(isEditing ? `/tour-tasks/${taskId}` : '/tour-tasks') : setStep((value) => value - 1)}>{step === 1 ? '取消' : '上一步'}</button>{step < 3 ? <button className="guide-button guide-button-primary editor-action-button" type="button" disabled={(step === 1 && !canContinueBasic) || (step === 2 && !canContinuePoints)} onClick={() => setStep((value) => value + 1)}>下一步</button> : <button className="guide-button guide-button-primary editor-action-button" type="button" disabled={mutation.isPending || !canContinueBasic || !canContinuePoints || hasInvalidActions} onClick={() => { setError(''); mutation.mutate() }}>{mutation.isPending ? '保存中' : '保存'}</button>}</footer>
    </div>
  </section>
}
