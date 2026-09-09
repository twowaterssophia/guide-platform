import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArrowLeft, MapPinned, Pencil, Route, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { TaskAction, TourTaskDetail } from '@guide/contracts'
import { ApiClientError } from '../../api/client'
import { useConfirmModalController, useToastStackController } from '../../ui-adapters'
import { archiveTourTask, deleteTourTask, getTourTask, publishTourTask, tourTasksQueryKey } from './tour-tasks-api'

const taskDateFormatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })
const actionLabels: Record<TaskAction['type'], string> = { SPEECH: '语音播报', SKILL: '执行技能', INTERACTION: '语音问答' }

function actionSummary(action: TaskAction) {
  if (action.type === 'SPEECH') return action.narration
  if (action.type === 'SKILL') return action.skillName
  return action.interactionPrompt || '未填写提问内容'
}

function statusLabel(status: TourTaskDetail['status']) {
  if (status === 'PUBLISHED') return '已发布'
  if (status === 'DRAFT') return '草稿'
  return '已归档'
}

export function TourTaskDetailPage() {
  const { taskId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showToast = useToastStackController()
  const [deleteTrigger, setDeleteTrigger] = useState<HTMLElement | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [lifecycleAction, setLifecycleAction] = useState<'publish' | 'archive' | null>(null)
  const [lifecycleTrigger, setLifecycleTrigger] = useState<HTMLElement | null>(null)
  const taskQuery = useQuery({ queryKey: [...tourTasksQueryKey, taskId], queryFn: () => getTourTask(taskId), enabled: Boolean(taskId) })
  const deleteMutation = useMutation({
    mutationFn: () => deleteTourTask(taskId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tourTasksQueryKey })
      showToast({ variant: 'success', title: '任务已删除', message: '导览任务及其编排内容已移除。' })
      navigate('/tour-tasks', { replace: true })
    },
    onError: (reason) => showToast({ variant: 'error', title: '删除任务失败', message: reason instanceof ApiClientError ? reason.message : '请刷新后重试。' }),
  })
  const lifecycleMutation = useMutation({
    mutationFn: (action: 'publish' | 'archive') => action === 'publish'
      ? publishTourTask(taskId, { expectedVersion: taskQuery.data!.version })
      : archiveTourTask(taskId, { expectedVersion: taskQuery.data!.version }),
    onSuccess: async (updated) => {
      queryClient.setQueryData([...tourTasksQueryKey, taskId], updated)
      await queryClient.invalidateQueries({ queryKey: tourTasksQueryKey })
      showToast({ variant: 'success', title: updated.status === 'PUBLISHED' ? '任务已发布' : '任务已归档', message: updated.status === 'PUBLISHED' ? `当前发布版本为 v${updated.version}。` : '已归档任务不会出现在 Agent 的已发布列表中。' })
      setLifecycleAction(null)
      setLifecycleTrigger(null)
    },
    onError: (reason, action) => {
      showToast({ variant: 'error', title: action === 'publish' ? '无法发布任务' : '无法归档任务', message: reason instanceof ApiClientError ? reason.message : '请刷新后重试。' })
      setLifecycleAction(null)
      setLifecycleTrigger(null)
    },
  })

  useConfirmModalController({
    open: confirmingDelete || Boolean(lifecycleAction),
    title: confirmingDelete
      ? (taskQuery.data ? `确认删除“${taskQuery.data.name}”？` : '')
      : lifecycleAction === 'publish' ? `确认发布“${taskQuery.data?.name ?? ''}”？` : `确认归档“${taskQuery.data?.name ?? ''}”？`,
    description: confirmingDelete
      ? '任务下的点位、路径和动作都会被删除。此操作不可撤销。'
      : lifecycleAction === 'publish' ? '发布后机器人可下载此任务版本；后续修改需要先归档。' : '归档后任务将停止作为最新发布版本提供下载，已下载版本不受影响。',
    trigger: confirmingDelete ? deleteTrigger : lifecycleTrigger,
    confirmLabel: confirmingDelete ? '确认删除' : lifecycleAction === 'publish' ? '发布任务' : '归档任务',
    danger: confirmingDelete,
    onConfirm: () => {
      if (confirmingDelete) { setConfirmingDelete(false); setDeleteTrigger(null); deleteMutation.mutate(); return }
      if (lifecycleAction) {
        const action = lifecycleAction
        setLifecycleAction(null)
        setLifecycleTrigger(null)
        lifecycleMutation.mutate(action)
      }
    },
    onCancel: () => {
      setConfirmingDelete(false)
      setDeleteTrigger(null)
      setLifecycleAction(null)
      setLifecycleTrigger(null)
    },
  })

  if (taskQuery.isLoading) return <section className="page-section"><div className="state-panel">正在加载任务详情</div></section>
  if (taskQuery.isError || !taskQuery.data) return <section className="page-section"><div className="state-panel state-error">无法加载该任务，请返回列表后重试。</div></section>
  const task = taskQuery.data
  const statusTone = task.status === 'PUBLISHED' ? 'success' : task.status === 'DRAFT' ? 'info' : 'default'

  return (
    <section className="page-section task-detail-page" aria-labelledby="task-detail-title">
      <div className="page-heading task-detail-heading">
        <div>
          <button className="guide-button guide-button-text editor-back" type="button" onClick={() => navigate('/tour-tasks')}><ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} />返回任务列表</button>
          <h1 id="task-detail-title">{task.name}</h1>
          <p className="page-summary">创建于 {taskDateFormatter.format(new Date(task.createdAt))} · 更新于 {taskDateFormatter.format(new Date(task.updatedAt))}</p>
        </div>
        <div className="persona-detail-actions">
          {task.status !== 'PUBLISHED' ? <button className="guide-button guide-button-secondary" type="button" onClick={() => navigate(`/tour-tasks/${task.id}/edit`)}><Pencil aria-hidden="true" size={16} strokeWidth={1.8} />编辑任务</button> : <span className="task-lifecycle-hint">已发布任务需先归档后编辑</span>}
          {task.status === 'PUBLISHED' ? <button className="guide-button guide-button-secondary" type="button" onClick={(event) => { setLifecycleTrigger(event.currentTarget); setLifecycleAction('archive') }}><Archive aria-hidden="true" size={16} strokeWidth={1.8} />归档任务</button> : <button className="guide-button guide-button-primary" type="button" onClick={(event) => { setLifecycleTrigger(event.currentTarget); setLifecycleAction('publish') }}><Send aria-hidden="true" size={16} strokeWidth={1.8} />{task.status === 'ARCHIVED' ? '再次发布' : '发布任务'}</button>}
          <button className="guide-button guide-button-danger-outline" type="button" onClick={(event) => { setDeleteTrigger(event.currentTarget); setConfirmingDelete(true) }}><Trash2 aria-hidden="true" size={16} strokeWidth={1.8} />删除</button>
        </div>
      </div>

      <dl className="task-detail-meta">
        <div><dt>地图</dt><dd><MapPinned aria-hidden="true" size={15} />{task.map.name}</dd></div>
        <div><dt>人设</dt><dd>{task.persona?.name ?? '未选择'}</dd></div>
        <div><dt>状态</dt><dd><span className={`guide-tag guide-tag-${statusTone}`}>{statusLabel(task.status)}</span></dd></div>
        <div><dt>版本</dt><dd>v{task.version}</dd></div>
      </dl>

      <section className="task-detail-section" aria-labelledby="task-points-title">
        <div className="task-detail-section-heading"><div><h2 id="task-points-title">点位与动作</h2><p>共 {task.points.length} 个点位，路径按点位顺序连接。</p></div><Route aria-hidden="true" size={20} strokeWidth={1.8} /></div>
        <div className="task-point-list">
          {task.points.map((point, index) => (
            <article className="task-point-card" key={point.id}>
              <div className="task-point-card-heading"><span className="point-index">{index + 1}</span><div><h3>{point.name}</h3><p>坐标 {point.x}, {point.y} · 朝向 {point.angle}°</p></div></div>
              {point.actions.length > 0 ? <div className="task-action-list">{point.actions.map((action) => <div className="task-action-row" key={action.id}><span className="guide-tag guide-tag-default">{actionLabels[action.type]}</span><span>{actionSummary(action)}</span></div>)}</div> : <p className="task-empty-action">未配置到达动作</p>}
              {index < task.points.length - 1 ? <div className="task-path-summary"><span><Route aria-hidden="true" size={14} />路径 {index + 1}</span>{task.paths[index]?.actions.length ? task.paths[index].actions.map((action) => <span key={action.id} className="task-path-action">{actionLabels[action.type]}：{actionSummary(action)}</span>) : <span className="task-empty-action">未配置路径动作</span>}</div> : null}
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
