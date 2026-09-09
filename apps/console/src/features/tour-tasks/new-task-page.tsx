import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, GripVertical, MapPinned, Plus, Save, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useBeforeUnload, useBlocker, useNavigate, useParams } from 'react-router-dom'
import type { MapAssetSummary, PersonaSummary, SkillSummary, TourTaskDetail, TourTaskUpdateInput, TourTaskWriteInput } from '@guide/contracts'
import { ApiClientError } from '../../api/client'
import { useConfirmModalController, useToastStackController } from '../../ui-adapters'
import { getMap, listMaps, mapPreviewUrl, mapsQueryKey } from '../maps/maps-api'
import { listCompatibleSkills, listPersonas, personaQueryKey } from '../personas/personas-api'
import { useDismissablePopover } from '../personas/persona-popover'
import { createTourTask, getTourTask, tourTasksQueryKey, updateTourTask } from './tour-tasks-api'

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

function detailToDraft(task: TourTaskDetail): TaskDraft {
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
    paths: task.paths.map((path) => ({
      fromPointKey: pointKeys.get(path.fromPointId) ?? '',
      toPointKey: pointKeys.get(path.toPointId) ?? '',
      actions: path.actions.map((action): PathAction => action.type === 'SPEECH'
        ? { type: 'SPEECH', narration: action.narration }
        : { type: 'INTERACTION', interactionPrompt: action.interactionPrompt ?? undefined }),
    })),
  }
}

function draftToInput(draft: TaskDraft): TourTaskWriteInput {
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
    paths: draft.paths.map((path) => ({
      fromPointKey: path.fromPointKey,
      toPointKey: path.toPointKey,
      actions: path.actions.map((action) => action.type === 'SPEECH'
        ? { type: 'SPEECH' as const, narration: action.narration.trim() }
        : { type: 'INTERACTION' as const, interactionPrompt: action.interactionPrompt?.trim() || undefined }),
    })),
  }
}

function sameDraft(left: TaskDraft, right: TaskDraft) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function PersonaPicker({ personas, value, onChange }: { personas: PersonaSummary[]; value: string | null; onChange: (value: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismissablePopover({ open, rootRef, triggerRef, onClose: close })
  const selected = personas.find((persona) => persona.id === value)
  return <div className="task-persona-picker" ref={rootRef}><button ref={triggerRef} type="button" className="task-persona-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>{selected ? `${selected.name}${selected.isSystemDefault ? '（系统默认）' : ''}` : '不指定人设'}<ChevronDown aria-hidden="true" size={16} /></button>{open ? <div className="task-persona-options" role="listbox" aria-label="语音人设列表"><button type="button" role="option" aria-selected={!value} onClick={() => { onChange(null); setOpen(false) }}>不指定人设{!value ? <Check aria-hidden="true" size={15} /> : null}</button>{personas.map((persona) => <button key={persona.id} type="button" role="option" aria-selected={persona.id === value} onClick={() => { onChange(persona.id); setOpen(false) }}>{persona.name}{persona.isSystemDefault ? '（系统默认）' : ''}{persona.id === value ? <Check aria-hidden="true" size={15} /> : null}</button>)}</div> : null}</div>
}

function MapPickerDialog({ open, maps, selectedMapId, trigger, onSelect, onClose }: { open: boolean; maps: MapAssetSummary[]; selectedMapId: string; trigger: HTMLButtonElement | null; onSelect: (mapId: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState('')
  const titleId = 'task-map-dialog-title'
  const searchRef = useRef<HTMLInputElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.requestAnimationFrame(() => searchRef.current?.focus())
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('keydown', keydown); document.body.style.overflow = previousOverflow; if (trigger?.isConnected) trigger.focus() }
  }, [onClose, open, trigger])
  useEffect(() => { if (!open) setSearch('') }, [open])
  if (!open) return null
  const filtered = maps.filter((map) => !search.trim() || map.name.toLowerCase().includes(search.trim().toLowerCase()))
  return createPortal(<div className="guide-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div ref={dialogRef} className="guide-modal task-map-select-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}><div className="guide-modal-header"><h2 className="guide-modal-title" id={titleId}>选择地图</h2><button className="guide-modal-close" type="button" aria-label="关闭" onClick={onClose}><X aria-hidden="true" size={18} /></button></div><div className="guide-modal-content"><input ref={searchRef} className="task-map-search" type="search" aria-label="搜索地图" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索地图" /><div className="task-map-select-list" role="listbox" aria-label="地图列表">{filtered.length ? filtered.map((map) => <button key={map.id} type="button" role="option" aria-selected={map.id === selectedMapId} onClick={() => onSelect(map.id)}><span><strong>{map.name}</strong><small>{map.pcdFileName}</small></span>{map.id === selectedMapId ? <Check aria-hidden="true" size={16} /> : null}</button>) : <p>没有匹配的地图</p>}</div></div><div className="guide-modal-footer"><button className="guide-button guide-button-secondary" type="button" onClick={onClose}>取消</button></div></div></div>, document.body)
}

function PointMapCanvas({ map, points, addMode, scale, onAddPoint, onMovePoint }: {
  map: Awaited<ReturnType<typeof getMap>> | undefined
  points: DraftPoint[]
  addMode: boolean
  scale: number
  onAddPoint: (x: number, y: number) => void
  onMovePoint: (key: string, x: number, y: number) => void
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const updatePointer = (event: ReactPointerEvent<HTMLDivElement>, key: string) => {
    const bounds = viewportRef.current?.getBoundingClientRect()
    if (!bounds) return
    const x = (event.clientX - bounds.left - bounds.width / 2) / scale + bounds.width / 2
    const y = (event.clientY - bounds.top - bounds.height / 2) / scale + bounds.height / 2
    onMovePoint(key, clamp(Math.round((x / bounds.width) * 960), 0, 960), clamp(Math.round((y / bounds.height) * 500), 0, 500))
  }
  return <div ref={viewportRef} className={`task-map-canvas${addMode ? ' is-adding' : ''}`} onPointerMove={(event) => { if (dragging) updatePointer(event, dragging) }} onPointerUp={() => setDragging(null)} onPointerLeave={() => setDragging(null)} onClick={(event) => {
    if (!addMode || (event.target as HTMLElement).closest('button')) return
    const bounds = viewportRef.current?.getBoundingClientRect()
    if (!bounds) return
    const x = (event.clientX - bounds.left - bounds.width / 2) / scale + bounds.width / 2
    const y = (event.clientY - bounds.top - bounds.height / 2) / scale + bounds.height / 2
    onAddPoint(clamp(Math.round((x / bounds.width) * 960), 0, 960), clamp(Math.round((y / bounds.height) * 500), 0, 500))
  }}>
    <div className="task-map-canvas-stage" style={{ transform: `scale(${scale})` }}>{map?.preview ? <img className="task-map-canvas-image" src={mapPreviewUrl(map.preview.url)} alt={`${map.name} 二维地图`} /> : <div className="task-map-canvas-empty"><MapPinned aria-hidden="true" size={28} /><span>{map ? '该地图没有可用二维预览，仍可用坐标编辑点位' : '正在加载地图预览'}</span></div>}{points.map((point, index) => <div key={point.key} className="task-map-point" style={{ left: `${(point.x / 960) * 100}%`, top: `${(point.y / 500) * 100}%` }}><button type="button" className="task-map-point-marker" aria-label={`${point.name || `点位 ${index + 1}`}，拖动调整位置`} onPointerDown={(event) => { event.stopPropagation(); setDragging(point.key); event.currentTarget.setPointerCapture?.(event.pointerId) }} onClick={(event) => event.stopPropagation()}><span>{index + 1}</span></button><span className="task-map-point-direction" style={{ transform: `rotate(${point.angle}deg)` }} aria-hidden="true">↑</span></div>)}</div>
  </div>
}

function ActionTypeMenu({ target, onAdd }: { target: 'point' | 'path'; onAdd: (type: PointAction['type']) => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismissablePopover({ open, rootRef, triggerRef, onClose: close })
  const options: PointAction['type'][] = target === 'path' ? ['SPEECH', 'INTERACTION'] : ['SPEECH', 'INTERACTION', 'SKILL']
  return <div className="task-action-menu" ref={rootRef}><button ref={triggerRef} className="guide-button guide-button-text" type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}><Plus aria-hidden="true" size={15} />添加任务</button>{open ? <div className="task-action-menu-content" role="menu" aria-label="选择任务类型">{options.map((type) => <button key={type} type="button" role="menuitem" onClick={() => { onAdd(type); setOpen(false) }}>{actionLabels[type]}</button>)}</div> : null}</div>
}

function ActionEditor({ action, skills, onChange, onDelete, onDragStart, onDrop }: { action: PointAction | PathAction; skills: SkillSummary[]; onChange: (action: PointAction | PathAction) => void; onDelete: () => void; onDragStart: () => void; onDrop: () => void }) {
  const [skillOpen, setSkillOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const close = useCallback(() => setSkillOpen(false), [])
  useDismissablePopover({ open: skillOpen, rootRef: pickerRef, triggerRef, onClose: close })
  return <div className="task-edit-action-row" draggable onDragStart={onDragStart} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><span className="task-action-order" aria-hidden="true"><GripVertical size={14} /></span><span className="guide-tag guide-tag-default">{actionLabels[action.type]}</span><div className="task-action-editor-field">{action.type === 'SPEECH' ? <textarea aria-label="语音播报内容" aria-invalid={!action.narration.trim()} rows={1} value={action.narration} placeholder="请输入播报内容" onChange={(event) => onChange({ ...action, narration: event.target.value })} /> : action.type === 'INTERACTION' ? <input aria-label="语音问答内容" value={action.interactionPrompt ?? ''} placeholder="可选：请输入提问引导" onChange={(event) => onChange({ ...action, interactionPrompt: event.target.value })} /> : <div className="task-skill-picker" ref={pickerRef}><button ref={triggerRef} type="button" className="task-skill-trigger" aria-haspopup="listbox" aria-expanded={skillOpen} aria-invalid={!action.skillId} onClick={() => setSkillOpen((value) => !value)}>{skills.find((skill) => skill.id === action.skillId)?.name ?? '请选择技能'}<ChevronDown aria-hidden="true" size={15} /></button>{skillOpen ? <div className="task-skill-options" role="listbox" aria-label="可用技能">{(['official', 'cloud'] as const).map((source) => <section key={source} aria-label={source === 'official' ? '官方技能' : '云端技能'}><h4>{source === 'official' ? '官方技能' : '云端技能'}</h4>{skills.filter((skill) => skill.source === source).map((skill) => <button key={skill.id} type="button" role="option" aria-selected={skill.id === action.skillId} onClick={() => { onChange({ type: 'SKILL', skillId: skill.id }); setSkillOpen(false) }}>{skill.name}{skill.id === action.skillId ? <Check aria-hidden="true" size={14} /> : null}</button>)}</section>)}</div> : null}</div>}</div><button className="guide-button guide-button-icon" type="button" aria-label={`删除${actionLabels[action.type]}`} title="删除任务" onClick={onDelete}><Trash2 aria-hidden="true" size={15} /></button></div>
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
  const [mapPickerOpen, setMapPickerOpen] = useState(false)
  const mapTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [addPointMode, setAddPointMode] = useState(false)
  const [scale, setScale] = useState(1)
  const [dragPointKey, setDragPointKey] = useState<string | null>(null)
  const [dragAction, setDragAction] = useState<{ target: 'point' | 'path'; key: string; index: number } | null>(null)
  const [error, setError] = useState('')
  const skipBlockRef = useRef(false)
  const mapsQuery = useQuery({ queryKey: mapsQueryKey, queryFn: listMaps })
  const personasQuery = useQuery({ queryKey: personaQueryKey, queryFn: listPersonas })
  const skillsQuery = useQuery({ queryKey: ['skills', 'compatible'], queryFn: listCompatibleSkills })
  const detailQuery = useQuery({ queryKey: [...tourTasksQueryKey, taskId], queryFn: () => getTourTask(taskId ?? ''), enabled: isEditing })
  const mapQuery = useQuery({ queryKey: [...mapsQueryKey, draft.mapId], queryFn: () => getMap(draft.mapId), enabled: step === 2 && Boolean(draft.mapId) })

  useEffect(() => { if (detailQuery.data) { const next = detailToDraft(detailQuery.data); setDraft(next); setInitialDraft(next) } }, [detailQuery.data])
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
    onSuccess: async (task) => { await queryClient.invalidateQueries({ queryKey: tourTasksQueryKey }); queryClient.setQueryData([...tourTasksQueryKey, task.id], task); skipBlockRef.current = true; showToast({ variant: 'success', title: isEditing ? '任务已保存' : '任务草稿已创建', message: '导览任务编排已保存。' }); navigate(`/tour-tasks/${task.id}`, { replace: true }) },
    onError: (reason) => setError(reason instanceof ApiClientError && reason.status === 409 ? '任务已被其他会话更新，请返回详情后刷新再试。' : reason instanceof ApiClientError ? reason.message : '保存失败，请检查填写内容后重试.'),
  })

  const maps = mapsQuery.data?.items ?? []
  const personas = personasQuery.data?.items ?? []
  const skills = skillsQuery.data ?? []
  const selectedMap = maps.find((map) => map.id === draft.mapId)
  const canContinueBasic = Boolean(draft.name.trim() && draft.mapId)
  const canContinuePoints = draft.points.length > 0 && draft.points.every((point) => point.name.trim())
  const hasInvalidActions = draft.points.some((point) => point.actions.some((action) => (action.type === 'SPEECH' && !action.narration.trim()) || (action.type === 'SKILL' && !action.skillId))) || draft.paths.some((path) => path.actions.some((action) => action.type === 'SPEECH' && !action.narration.trim()))
  const updateDraft = (change: (current: TaskDraft) => TaskDraft) => setDraft((current) => change(current))
  const rebuildPaths = (points: DraftPoint[], current: DraftPath[]) => points.slice(0, -1).map((point, index) => { const next = points[index + 1]!; return current.find((path) => path.fromPointKey === point.key && path.toPointKey === next.key) ?? { fromPointKey: point.key, toPointKey: next.key, actions: [] } })
  const addPoint = (x: number, y: number) => { updateDraft((current) => { const key = `point-${Date.now()}-${current.points.length}`; const points = [...current.points, { key, name: `点位 ${current.points.length + 1}`, x, y, angle: 0, actions: [] }]; return { ...current, points, paths: rebuildPaths(points, current.paths) } }); setAddPointMode(false) }
  const removePoint = (key: string) => updateDraft((current) => { const points = current.points.filter((point) => point.key !== key); return { ...current, points, paths: rebuildPaths(points, current.paths) } })
  const reorderPoint = (sourceKey: string, targetKey: string) => updateDraft((current) => { const source = current.points.find((point) => point.key === sourceKey); if (!source || sourceKey === targetKey) return current; const points = current.points.filter((point) => point.key !== sourceKey); const targetIndex = points.findIndex((point) => point.key === targetKey); points.splice(targetIndex < 0 ? points.length : targetIndex, 0, source); return { ...current, points, paths: rebuildPaths(points, current.paths) } })
  const addAction = (target: 'point' | 'path', key: string, type: PointAction['type']) => updateDraft((current) => target === 'point' ? { ...current, points: current.points.map((point) => point.key === key ? { ...point, actions: [...point.actions, type === 'SPEECH' ? { type, narration: '' } : type === 'SKILL' ? { type, skillId: '' } : { type, interactionPrompt: '' }] } : point) } : { ...current, paths: current.paths.map((path) => `${path.fromPointKey}-${path.toPointKey}` === key ? { ...path, actions: [...path.actions, type === 'SPEECH' ? { type, narration: '' } : { type: 'INTERACTION' as const, interactionPrompt: '' }] } : path) })
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
    <div className="page-heading"><div><button className="guide-button guide-button-text editor-back" type="button" onClick={() => navigate(isEditing ? `/tour-tasks/${taskId}` : '/tour-tasks')}><ArrowLeft aria-hidden="true" size={16} />{isEditing ? '返回任务详情' : '返回任务列表'}</button><h1 id="new-task-title">{isEditing ? '编辑导览任务' : '新建导览任务'}</h1><p className="page-summary">按三个步骤配置地图、点位和机器人动作，内容保存到当前账号。</p></div></div>
    <ol className="editor-stepper" aria-label="任务编辑步骤">{['基本信息', '点位设置', '动作编排'].map((label, index) => { const number = index + 1; return <li className={`editor-step${step === number ? ' is-current' : step > number ? ' is-complete' : ''}`} key={label}><button type="button" disabled={number > step} onClick={() => number < step && setStep(number)} aria-current={step === number ? 'step' : undefined}><span className="editor-step-number">{step > number ? <Check aria-hidden="true" size={14} /> : number}</span><span>{label}</span></button>{number < 3 ? <ChevronRight className="editor-step-divider" aria-hidden="true" size={16} /> : null}</li> })}</ol>
    <div className="editor-card task-editor-card">
      {step === 1 ? <div className="editor-panel" aria-labelledby="editor-step-title"><h2 id="editor-step-title">基本信息</h2><p className="editor-help">先填写任务名称，并选择任务使用的地图和语音人设。</p><div className="editor-form-grid"><label className="editor-field"><span>任务名称</span><input aria-label="任务名称" value={draft.name} maxLength={120} onChange={(event) => updateDraft((current) => ({ ...current, name: event.target.value }))} placeholder="例如：王府井大厅导览" /></label><div className="editor-field"><span id="task-map-label">地图</span><div className="task-map-picker"><button ref={mapTriggerRef} type="button" className="task-map-trigger" aria-label={`地图，${selectedMap?.name ?? (mapsQuery.isError ? '无法加载地图' : '请选择地图')}`} aria-haspopup="dialog" aria-expanded={mapPickerOpen} onClick={() => setMapPickerOpen(true)} disabled={mapsQuery.isLoading || isEditing}>{selectedMap?.name ?? (mapsQuery.isError ? '无法加载地图' : '请选择地图')}<ChevronDown aria-hidden="true" size={16} /></button></div>{isEditing ? <small className="task-field-hint">已有任务的地图不可更换，以免点位坐标失效。</small> : null}</div></div><div className="editor-form-grid task-editor-persona-grid"><div className="editor-field"><span id="task-persona-label">语音人设</span><PersonaPicker personas={personas} value={draft.personaId} onChange={(personaId) => updateDraft((current) => ({ ...current, personaId }))} /></div></div><MapPickerDialog open={mapPickerOpen} maps={maps} selectedMapId={draft.mapId} trigger={mapTriggerRef.current} onSelect={(mapId) => { updateDraft((current) => ({ ...current, mapId })); setMapPickerOpen(false) }} onClose={() => setMapPickerOpen(false)} /></div> : null}
      {step === 2 ? <div className="editor-panel task-points-panel" aria-labelledby="editor-step-title"><div className="editor-panel-heading"><div><h2 id="editor-step-title">点位设置</h2><p className="editor-help">在地图上点击添加点位，也可以拖动标记或直接编辑坐标与朝向。</p></div><div className="task-map-tools"><button className={`guide-button guide-button-primary${addPointMode ? ' is-active' : ''}`} type="button" onClick={() => setAddPointMode((value) => !value)}><Plus aria-hidden="true" size={16} />{addPointMode ? '取消添加' : '添加点位'}</button><button className="guide-button guide-button-icon" type="button" aria-label="放大地图" title="放大地图" onClick={() => setScale((value) => clamp(Number((value + 0.15).toFixed(2)), 0.7, 2.5))}><ZoomIn aria-hidden="true" size={16} /></button><button className="guide-button guide-button-icon" type="button" aria-label="缩小地图" title="缩小地图" onClick={() => setScale((value) => clamp(Number((value - 0.15).toFixed(2)), 0.7, 2.5))}><ZoomOut aria-hidden="true" size={16} /></button></div></div><PointMapCanvas map={mapQuery.data} points={draft.points} addMode={addPointMode} scale={scale} onAddPoint={addPoint} onMovePoint={(key, x, y) => updateDraft((current) => ({ ...current, points: current.points.map((point) => point.key === key ? { ...point, x, y } : point) }))} /><div className="task-point-list-heading"><h3>点位列表</h3><span>{draft.points.length} 个点位</span></div><div className="task-point-edit-list" role="list" aria-label="点位列表">{draft.points.length === 0 ? <div className="task-point-empty">还没有点位，请在地图上添加。</div> : draft.points.map((point, index) => <article key={point.key} className="task-point-edit-row" draggable onDragStart={() => setDragPointKey(point.key)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragPointKey) reorderPoint(dragPointKey, point.key); setDragPointKey(null) }}><button className="guide-button guide-button-icon task-point-drag" type="button" aria-label={`拖动调整 ${point.name} 顺序`} title="拖动排序"><GripVertical aria-hidden="true" size={17} /></button><span className="point-index">{index + 1}</span><label className="editor-field"><span>点位名称</span><input value={point.name} onChange={(event) => updateDraft((current) => ({ ...current, points: current.points.map((item) => item.key === point.key ? { ...item, name: event.target.value } : item) }))} /></label><label className="editor-field"><span>X</span><input type="number" min="0" max="960" value={point.x} onChange={(event) => updateDraft((current) => ({ ...current, points: current.points.map((item) => item.key === point.key ? { ...item, x: clamp(Number(event.target.value) || 0, 0, 960) } : item) }))} /></label><label className="editor-field"><span>Y</span><input type="number" min="0" max="500" value={point.y} onChange={(event) => updateDraft((current) => ({ ...current, points: current.points.map((item) => item.key === point.key ? { ...item, y: clamp(Number(event.target.value) || 0, 0, 500) } : item) }))} /></label><label className="editor-field"><span>朝向</span><input type="number" min="0" max="359" value={point.angle} onChange={(event) => updateDraft((current) => ({ ...current, points: current.points.map((item) => item.key === point.key ? { ...item, angle: clamp(Number(event.target.value) || 0, 0, 359) } : item) }))} /></label><button className="guide-button guide-button-icon" type="button" aria-label={`删除 ${point.name}`} title="删除点位" onClick={() => removePoint(point.key)}><Trash2 aria-hidden="true" size={16} /></button></article>)}</div></div> : null}
      {step === 3 ? <div className="editor-panel task-actions-panel" aria-labelledby="editor-step-title"><div><h2 id="editor-step-title">动作编排</h2><p className="editor-help">分别设置抵达点位后和点位之间的动作。路径中不能执行技能。</p></div><div className="task-action-sections">{draft.points.map((point, index) => <div className="task-action-section" key={point.key}><div className="task-action-section-heading"><div><h3>抵达「{point.name || `点位 ${index + 1}`}」后</h3><p>机器人到达点位时按顺序执行。</p></div><ActionTypeMenu target="point" onAdd={(type) => addAction('point', point.key, type)} /></div>{point.actions.map((action, actionIndex) => <ActionEditor key={`${point.key}-${actionIndex}`} action={action} skills={skills} onChange={(next) => updateAction('point', point.key, actionIndex, next)} onDelete={() => removeAction('point', point.key, actionIndex)} onDragStart={() => setDragAction({ target: 'point', key: point.key, index: actionIndex })} onDrop={() => { reorderAction('point', point.key, actionIndex); setDragAction(null) }} />)}{index < draft.points.length - 1 ? (() => { const next = draft.points[index + 1]!; const path = draft.paths.find((item) => item.fromPointKey === point.key && item.toPointKey === next.key); if (!path) return null; const pathKey = `${path.fromPointKey}-${path.toPointKey}`; return <div className="task-action-path"><div className="task-action-section-heading"><div><h3>从「{point.name}」到「{next.name}」途中</h3><p>仅支持语音播报和语音问答。</p></div><ActionTypeMenu target="path" onAdd={(type) => addAction('path', pathKey, type)} /></div>{path.actions.map((action, actionIndex) => <ActionEditor key={`${pathKey}-${actionIndex}`} action={action} skills={skills} onChange={(nextAction) => updateAction('path', pathKey, actionIndex, nextAction)} onDelete={() => removeAction('path', pathKey, actionIndex)} onDragStart={() => setDragAction({ target: 'path', key: pathKey, index: actionIndex })} onDrop={() => { reorderAction('path', pathKey, actionIndex); setDragAction(null) }} />)}</div> })() : null}</div>)}</div><div className="editor-summary"><strong>{draft.name || '未命名任务'}</strong><span>{selectedMap?.name ?? '未选择地图'} · {draft.points.length} 个点位 · {draft.points.reduce((count, point) => count + point.actions.length, 0) + draft.paths.reduce((count, path) => count + path.actions.length, 0)} 个动作</span></div></div> : null}
      {error || mutation.isError ? <p className="editor-form-error" role="alert">{error || '保存失败，请检查填写内容后重试。'}</p> : null}
      <footer className="editor-actions"><button className="guide-button guide-button-secondary" type="button" onClick={() => step === 1 ? navigate(isEditing ? `/tour-tasks/${taskId}` : '/tour-tasks') : setStep((value) => value - 1)}><ChevronLeft aria-hidden="true" size={16} />{step === 1 ? '取消' : '上一步'}</button>{step < 3 ? <button className="guide-button guide-button-primary" type="button" disabled={(step === 1 && !canContinueBasic) || (step === 2 && !canContinuePoints)} onClick={() => setStep((value) => value + 1)}>下一步<ChevronRight aria-hidden="true" size={16} /></button> : <button className="guide-button guide-button-primary" type="button" disabled={mutation.isPending || !canContinueBasic || !canContinuePoints || hasInvalidActions} onClick={() => { setError(''); mutation.mutate() }}><Save aria-hidden="true" size={16} />{mutation.isPending ? '正在保存' : '保存草稿'}</button>}</footer>
    </div>
  </section>
}
