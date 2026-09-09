import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Plus, Route } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { tourTaskListSchema } from '@guide/contracts'
import type { TourTaskSummary } from '@guide/contracts'
import { getJson } from '../../api/client'
import { TaskMenuAdapter, useConfirmModalController, useToastStackController } from '../../ui-adapters'

const taskStatusLabels: Record<TourTaskSummary['status'], string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
}

const taskDateFormatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })

export function TourTaskListPage() {
  const navigate = useNavigate()
  const [deleteTask, setDeleteTask] = useState<TourTaskSummary | null>(null)
  const [deleteTrigger, setDeleteTrigger] = useState<HTMLElement | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const showToast = useToastStackController()
  const taskQuery = useQuery({
    queryKey: ['tour-tasks'],
    queryFn: async () => tourTaskListSchema.parse(await getJson('/tour-tasks')),
  })

  const tasks = taskQuery.data ?? []
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null

  const confirmDelete = () => {
    setDeleteTask(null)
    setDeleteTrigger(null)
    showToast({
      variant: 'warning',
      title: '删除未执行',
      message: '删除接口尚未接入，未修改数据。',
    })
  }

  useConfirmModalController({
    open: Boolean(deleteTask),
    title: deleteTask ? `确认删除“${deleteTask.name}”？` : '',
    description: deleteTask ? '删除操作需要后端接口确认，当前只会关闭这个确认窗口并保留任务数据。' : undefined,
    trigger: deleteTrigger,
    onConfirm: confirmDelete,
    onCancel: () => {
      setDeleteTask(null)
      setDeleteTrigger(null)
    },
  })

  const openTaskDetail = (taskId: string) => {
    setSelectedTaskId(taskId)
  }

  const editTask = (task: TourTaskSummary) => {
    navigate('/tour-tasks/new', { state: { mode: 'edit', taskId: task.id } })
  }

  const requestDelete = (task: TourTaskSummary, trigger: HTMLElement) => {
    setDeleteTrigger(trigger)
    setDeleteTask(task)
  }

  return (
    <section className="page-section" aria-labelledby="tour-tasks-title">
      <div className="page-heading">
        <div>
          <h1 id="tour-tasks-title">导览任务</h1>
          <p className="page-summary">设置机器人要执行的导览内容</p>
        </div>
        <button className="guide-button guide-button-primary" type="button" onClick={() => navigate('/tour-tasks/new')}>
          <Plus aria-hidden="true" size={16} strokeWidth={2.2} />
          新建导览任务
        </button>
      </div>
      {taskQuery.isLoading ? <div className="state-panel">正在加载导览任务</div> : null}
      {taskQuery.isError ? <div className="state-panel state-error">暂时无法加载导览任务，请检查本地服务。</div> : null}
      {taskQuery.isSuccess && tasks.length === 0 ? (
        <div className="guide-empty">
          <div className="guide-empty-icon" aria-hidden="true">
            <Route aria-hidden="true" size={42} strokeWidth={1.35} />
          </div>
          <h2 className="guide-empty-title">暂无导览任务</h2>
          <p className="guide-empty-description">创建第一个导览任务，让机器人开始执行导览。</p>
          <button className="guide-button guide-button-primary guide-empty-action" type="button" onClick={() => navigate('/tour-tasks/new')}>
            <Plus aria-hidden="true" size={16} strokeWidth={2.2} />
            新建导览任务
          </button>
        </div>
      ) : null}
      {taskQuery.isSuccess && tasks.length > 0 ? (
        <div className="table-wrap guide-table-scroll">
          <table className="guide-table">
            <thead className="guide-table-head">
              <tr className="guide-table-row">
                <th className="guide-table-header-cell">任务名称</th>
                <th className="guide-table-header-cell">地图</th>
                <th className="guide-table-header-cell">点位数量</th>
                <th className="guide-table-header-cell">状态</th>
                <th className="guide-table-header-cell">创建时间</th>
                <th className="guide-table-header-cell guide-table-header-cell-actions actions-column">操作</th>
              </tr>
            </thead>
            <tbody className="guide-table-body">
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className={`guide-table-row guide-table-row-interactive${selectedTaskId === task.id ? ' is-selected' : ''}`}
                  tabIndex={0}
                  aria-label={`查看任务 ${task.name}`}
                  onClick={() => openTaskDetail(task.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openTaskDetail(task.id)
                    }
                  }}
                >
                  <td className="guide-table-cell guide-table-cell-name task-name">{task.name}</td>
                  <td className="guide-table-cell">{task.mapName}</td>
                  <td className="guide-table-cell">{task.pointCount}</td>
                  <td className="guide-table-cell"><span className={`guide-tag guide-tag-${task.status === 'PUBLISHED' ? 'success' : task.status === 'DRAFT' ? 'info' : 'default'}`} title={taskStatusLabels[task.status]}>{taskStatusLabels[task.status]}</span></td>
                  <td className="guide-table-cell">{taskDateFormatter.format(new Date(task.createdAt))}</td>
                  <td className="guide-table-cell guide-table-cell-actions actions-cell" onClick={(event) => event.stopPropagation()}>
                    <button className="guide-button guide-button-icon" type="button" aria-label={`编辑 ${task.name}`} title="编辑" onClick={() => editTask(task)}>
                      <Pencil aria-hidden="true" size={16} strokeWidth={1.8} />
                    </button>
                    <TaskMenuAdapter taskName={task.name} onDelete={(trigger) => requestDelete(task, trigger)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {selectedTask ? (
        <section className="task-detail-panel" aria-labelledby="task-detail-title">
          <div className="task-detail-heading">
            <div>
              <p className="eyebrow">任务详情</p>
              <h2 id="task-detail-title">{selectedTask.name}</h2>
            </div>
            <button className="guide-button guide-button-secondary" type="button" onClick={() => setSelectedTaskId(null)}>
              <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} />
              返回列表
            </button>
          </div>
          <dl className="task-detail-grid">
            <div><dt>地图</dt><dd>{selectedTask.mapName}</dd></div>
            <div><dt>点位数量</dt><dd>{selectedTask.pointCount}</dd></div>
            <div><dt>状态</dt><dd><span className={`guide-tag guide-tag-${selectedTask.status === 'PUBLISHED' ? 'success' : selectedTask.status === 'DRAFT' ? 'info' : 'default'}`} title={taskStatusLabels[selectedTask.status]}>{taskStatusLabels[selectedTask.status]}</span></dd></div>
            <div><dt>版本</dt><dd>v{selectedTask.version}</dd></div>
            <div><dt>创建时间</dt><dd>{taskDateFormatter.format(new Date(selectedTask.createdAt))}</dd></div>
            <div><dt>更新时间</dt><dd>{taskDateFormatter.format(new Date(selectedTask.updatedAt))}</dd></div>
          </dl>
          <div className="task-detail-actions">
            <button className="guide-button guide-button-primary" type="button" onClick={() => editTask(selectedTask)}>
              <Pencil aria-hidden="true" size={16} strokeWidth={1.8} />
              编辑任务
            </button>
          </div>
        </section>
      ) : null}
    </section>
  )
}
