import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Route } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TourTaskSummary } from '@guide/contracts'
import { ApiClientError } from '../../api/client'
import { TaskMenuAdapter, useConfirmModalController, useToastStackController } from '../../ui-adapters'
import { deleteTourTask, listTourTasks, tourTasksQueryKey } from './tour-tasks-api'

const taskStatusLabels: Record<TourTaskSummary['status'], string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
}
const taskDateFormatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })

export function TourTaskListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showToast = useToastStackController()
  const [deleteTask, setDeleteTask] = useState<TourTaskSummary | null>(null)
  const [deleteTrigger, setDeleteTrigger] = useState<HTMLElement | null>(null)
  const taskQuery = useQuery({ queryKey: tourTasksQueryKey, queryFn: listTourTasks })
  const deleteMutation = useMutation({
    mutationFn: deleteTourTask,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tourTasksQueryKey })
      showToast({ variant: 'success', title: '任务已删除', message: '导览任务及其点位、路径和动作已移除。' })
    },
    onError: (reason) => showToast({ variant: 'error', title: '删除任务失败', message: reason instanceof ApiClientError ? reason.message : '请刷新后重试。' }),
  })

  useConfirmModalController({
    open: Boolean(deleteTask),
    title: deleteTask ? `确认删除“${deleteTask.name}”？` : '',
    description: '任务下的点位、路径和动作都会被删除。此操作不可撤销。',
    trigger: deleteTrigger,
    onConfirm: () => {
      const task = deleteTask
      setDeleteTask(null)
      setDeleteTrigger(null)
      if (task) deleteMutation.mutate(task.id)
    },
    onCancel: () => { setDeleteTask(null); setDeleteTrigger(null) },
  })

  const tasks = taskQuery.data ?? []
  return (
    <section className="page-section" aria-labelledby="tour-tasks-title">
      <div className="page-heading">
        <div><h1 id="tour-tasks-title">导览任务</h1><p className="page-summary">设置机器人要执行的导览内容</p></div>
        <button className="guide-button guide-button-primary" type="button" onClick={() => navigate('/tour-tasks/new')}><Plus aria-hidden="true" size={16} strokeWidth={2.2} />新建导览任务</button>
      </div>
      {taskQuery.isLoading ? <div className="state-panel">正在加载导览任务</div> : null}
      {taskQuery.isError ? <div className="state-panel state-error">暂时无法加载导览任务，请检查本地服务。</div> : null}
      {taskQuery.isSuccess && tasks.length === 0 ? (
        <div className="guide-empty"><div className="guide-empty-icon" aria-hidden="true"><Route size={42} strokeWidth={1.35} /></div><h2 className="guide-empty-title">暂无导览任务</h2><p className="guide-empty-description">创建第一个导览任务，让机器人开始执行导览。</p><button className="guide-button guide-button-primary guide-empty-action" type="button" onClick={() => navigate('/tour-tasks/new')}><Plus aria-hidden="true" size={16} strokeWidth={2.2} />新建导览任务</button></div>
      ) : null}
      {taskQuery.isSuccess && tasks.length > 0 ? (
        <div className="table-wrap guide-table-scroll"><table className="guide-table" aria-label="导览任务列表"><thead className="guide-table-head"><tr className="guide-table-row"><th className="guide-table-header-cell">任务名称</th><th className="guide-table-header-cell">地图</th><th className="guide-table-header-cell">点位数量</th><th className="guide-table-header-cell">状态</th><th className="guide-table-header-cell">创建时间</th><th className="guide-table-header-cell guide-table-header-cell-actions actions-column">操作</th></tr></thead><tbody className="guide-table-body">
          {tasks.map((task) => <tr key={task.id} className="guide-table-row guide-table-row-interactive" tabIndex={0} aria-label={`查看任务 ${task.name}`} onClick={() => navigate(`/tour-tasks/${task.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/tour-tasks/${task.id}`) } }}><td className="guide-table-cell guide-table-cell-name task-name" title={task.name}>{task.name}</td><td className="guide-table-cell">{task.mapName}</td><td className="guide-table-cell">{task.pointCount}</td><td className="guide-table-cell"><span className={`guide-tag guide-tag-${task.status === 'PUBLISHED' ? 'success' : task.status === 'DRAFT' ? 'info' : 'default'}`}>{taskStatusLabels[task.status]}</span></td><td className="guide-table-cell">{taskDateFormatter.format(new Date(task.createdAt))}</td><td className="guide-table-cell guide-table-cell-actions actions-cell" onClick={(event) => event.stopPropagation()}>{task.status !== 'PUBLISHED' ? <button className="guide-button guide-button-icon" type="button" aria-label={`编辑 ${task.name}`} title="编辑" onClick={() => navigate(`/tour-tasks/${task.id}/edit`)}><Pencil aria-hidden="true" size={16} strokeWidth={1.8} /></button> : null}<TaskMenuAdapter taskName={task.name} onDelete={(trigger) => { setDeleteTrigger(trigger); setDeleteTask(task) }} /></td></tr>)}
        </tbody></table></div>
      ) : null}
    </section>
  )
}
