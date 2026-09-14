import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowUp, Flag, MoveRight, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { TaskAction } from '@guide/contracts'
import { ApiClientError } from '../../api/client'
import { useConfirmModalController, useToastStackController } from '../../ui-adapters'
import { getMap, mapPreviewUrl, mapsQueryKey } from '../maps/maps-api'
import { deleteTourTask, getTourTask, tourTasksQueryKey } from './tour-tasks-api'
import { TaskPathTitle } from './task-title'

const actionLabels: Record<TaskAction['type'], string> = { SPEECH: '语音播报', SKILL: '执行技能', INTERACTION: '语音问答' }
const fallbackMapDimensions = { width: 960, height: 500 }

function getMapDimensions(width: number | undefined, height: number | undefined) {
  if (!width || !height || width <= 1 || height <= 1) return fallbackMapDimensions
  return { width, height }
}

function actionSummary(action: TaskAction) {
  if (action.type === 'SPEECH') return action.narration
  if (action.type === 'SKILL') return action.skillName
  return action.interactionPrompt || '未填写提问内容'
}

export function TourTaskDetailPage() {
  const { taskId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showToast = useToastStackController()
  const [deleteTrigger, setDeleteTrigger] = useState<HTMLElement | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const taskQuery = useQuery({ queryKey: [...tourTasksQueryKey, taskId], queryFn: () => getTourTask(taskId), enabled: Boolean(taskId) })
  const mapId = taskQuery.data?.map.id ?? ''
  const mapQuery = useQuery({ queryKey: [...mapsQueryKey, mapId], queryFn: () => getMap(mapId), enabled: Boolean(mapId) })
  const deleteMutation = useMutation({
    mutationFn: () => deleteTourTask(taskId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tourTasksQueryKey })
      showToast({ variant: 'success', title: '任务已删除', message: '导览任务及其编排内容已移除。' })
      navigate('/tour-tasks', { replace: true })
    },
    onError: (reason) => showToast({ variant: 'error', title: '删除任务失败', message: reason instanceof ApiClientError ? reason.message : '请刷新后重试。' }),
  })
  useConfirmModalController({
    open: confirmingDelete,
    title: taskQuery.data ? `确认删除“${taskQuery.data.name}”？` : '',
    description: '任务下的点位、路径和动作都会被删除。此操作不可撤销。',
    trigger: deleteTrigger,
    confirmLabel: '确认删除',
    danger: confirmingDelete,
    onConfirm: () => {
      setConfirmingDelete(false); setDeleteTrigger(null); deleteMutation.mutate()
    },
    onCancel: () => {
      setConfirmingDelete(false)
      setDeleteTrigger(null)
    },
  })

  if (taskQuery.isLoading) return <section className="page-section"><div className="state-panel">正在加载任务详情</div></section>
  if (taskQuery.isError || !taskQuery.data) return <section className="page-section"><div className="state-panel state-error">无法加载该任务，请返回列表后重试。</div></section>
  const task = taskQuery.data
  const hasVoiceTask = task.points.some((point) => point.actions.some((action) => action.type === 'SPEECH' || action.type === 'INTERACTION'))
    || task.paths.some((path) => path.actions.some((action) => action.type === 'SPEECH' || action.type === 'INTERACTION'))
  const shouldShowPersona = hasVoiceTask || Boolean(task.persona && !task.persona.isSystemDefault)
  const mapDimensions = getMapDimensions(mapQuery.data?.registration?.width, mapQuery.data?.registration?.height)
  const mapStyle = { aspectRatio: `${mapDimensions.width} / ${mapDimensions.height}`, maxWidth: mapDimensions.width === mapDimensions.height ? 720 : undefined }
  return (
    <section className="page-section task-detail-page" aria-labelledby="task-detail-title">
      <div className="page-heading task-detail-heading">
        <div>
          <button className="guide-button guide-button-text editor-back" type="button" onClick={() => navigate('/tour-tasks')}><ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} />返回任务列表</button>
          <h1 id="task-detail-title">{task.name}</h1>
        </div>
        <div className="detail-heading-actions">
          <button className="guide-button guide-button-secondary" type="button" onClick={() => navigate(`/tour-tasks/${task.id}/edit`)}><Pencil aria-hidden="true" size={16} strokeWidth={1.8} />编辑</button>
          <button className="guide-button guide-button-danger-outline" type="button" onClick={(event) => { setDeleteTrigger(event.currentTarget); setConfirmingDelete(true) }}><Trash2 aria-hidden="true" size={16} strokeWidth={1.8} />删除</button>
        </div>
      </div>

      <section className="task-detail-map-section" aria-labelledby="task-map-title">
        <div className="task-detail-section-heading"><div><h2 id="task-map-title">地图及点位</h2><p>{task.map.name}</p></div></div>
        <div className="task-detail-map" style={mapStyle}>
          {mapQuery.data?.preview ? <img src={mapPreviewUrl(mapQuery.data.preview.url)} alt={`${task.map.name} 二维地图`} /> : <div className="map-preview-unavailable">二维地图暂不可用</div>}
          {task.points.map((point, index) => <div className="task-detail-map-point" key={point.id} style={{ left: `${Math.min(100, Math.max(0, point.x / mapDimensions.width * 100))}%`, top: `${Math.min(100, Math.max(0, point.y / mapDimensions.height * 100))}%` }}><span className="task-detail-map-direction-orbit" style={{ transform: `rotate(${point.angle}deg)` }}><span className="task-detail-map-direction"><ArrowUp aria-hidden="true" size={16} strokeWidth={2.4} /></span></span><span>{index + 1}</span><small>{point.name}</small></div>)}
        </div>
      </section>

      <section className="task-detail-section" aria-labelledby="task-points-title">
        <div className="task-detail-section-heading"><div><h2 id="task-points-title">任务</h2><p>共 {task.points.length} 个点位，路径按点位顺序连接。</p></div></div>
        <div className="task-point-list">
          {task.points.flatMap((point, index) => {
            const hasPointActions = point.actions.length > 0
            const pointCard = <article className={`task-point-card${hasPointActions ? '' : ' is-empty'}`} key={`point-${point.id}`}>
              <div className="task-point-card-heading"><Flag aria-hidden="true" size={18} /><div><h3>{point.name}</h3><p>坐标 {point.x}, {point.y} · 朝向 {point.angle}°</p></div></div>
              {hasPointActions ? <div className="task-action-list">{point.actions.map((action) => <div className="task-action-row" key={action.id}><span className="task-action-type-label">{actionLabels[action.type]}</span><span>{actionSummary(action)}</span></div>)}</div> : null}
            </article>
            if (index === task.points.length - 1) return [pointCard]
            const next = task.points[index + 1]!
            const path = task.paths[index]
            const hasPathActions = Boolean(path?.actions.length)
            return [pointCard, <article className={`task-point-card task-path-card${hasPathActions ? '' : ' is-empty'}`} key={`path-${point.id}-${next.id}`}>
              <div className="task-point-card-heading"><MoveRight aria-hidden="true" size={18} /><div><TaskPathTitle from={point.name} to={next.name} /></div></div>
              {hasPathActions ? <div className="task-action-list">{path!.actions.map((action) => <div className="task-action-row" key={action.id}><span className="task-action-type-label">{actionLabels[action.type]}</span><span>{actionSummary(action)}</span></div>)}</div> : null}
            </article>]
          })}
        </div>
      </section>

      {shouldShowPersona ? <section className="task-detail-section task-detail-persona-section" aria-labelledby="task-persona-title">
        <div className="task-detail-section-heading"><div><h2 id="task-persona-title">人设</h2><p>{task.persona?.name ?? '默认'}</p></div></div>
      </section> : null}
    </section>
  )
}
