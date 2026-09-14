import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TourTaskSummary } from '@guide/contracts'
import { ApiClientError } from '../../api/client'
import { useConfirmModalController, useToastStackController } from '../../ui-adapters'
import { LegacyEmptyIllustration } from '../../ui/legacy-empty-illustration'
import { deleteTourTask, listTourTasks, tourTasksQueryKey } from './tour-tasks-api'

const taskDateFormatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })
const taskPageSize = 10

function TaskPagination({ page, pageCount, total, onPageChange }: { page: number; pageCount: number; total: number; onPageChange: (page: number) => void }) {
  if (pageCount <= 1) return null
  return <nav className="guide-pagination" aria-label="导览任务分页"><span>共 {total} 条</span><div><button className="guide-button guide-button-icon" type="button" aria-label="上一页" title="上一页" disabled={page === 1} onClick={() => onPageChange(page - 1)}><ChevronLeft aria-hidden="true" size={16} /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => <button className={`guide-pagination-page${item === page ? ' is-current' : ''}`} type="button" key={item} aria-label={`第 ${item} 页`} aria-current={item === page ? 'page' : undefined} onClick={() => onPageChange(item)}>{item}</button>)}<button className="guide-button guide-button-icon" type="button" aria-label="下一页" title="下一页" disabled={page === pageCount} onClick={() => onPageChange(page + 1)}><ChevronRight aria-hidden="true" size={16} /></button></div></nav>
}

export function TourTaskListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showToast = useToastStackController()
  const [deleteTask, setDeleteTask] = useState<TourTaskSummary | null>(null)
  const [deleteTrigger, setDeleteTrigger] = useState<HTMLElement | null>(null)
  const [page, setPage] = useState(1)
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
  const pageCount = Math.max(1, Math.ceil(tasks.length / taskPageSize))
  const visibleTasks = tasks.slice((page - 1) * taskPageSize, page * taskPageSize)
  const showHeaderAction = !taskQuery.isSuccess || tasks.length > 0

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount))
  }, [pageCount])

  return (
    <section className="page-section" aria-labelledby="tour-tasks-title">
      <div className="page-heading">
        <div><h1 id="tour-tasks-title">导览任务</h1><p className="page-summary">设置机器人要执行的导览内容</p></div>
        {showHeaderAction ? <button className="guide-button guide-button-primary" type="button" onClick={() => navigate('/tour-tasks/new')}><Plus aria-hidden="true" size={16} strokeWidth={2.2} />新建导览任务</button> : null}
      </div>
      {taskQuery.isLoading ? <div className="state-panel">正在加载导览任务</div> : null}
      {taskQuery.isError ? <div className="state-panel state-error">暂时无法加载导览任务，请检查本地服务。</div> : null}
      {taskQuery.isSuccess && tasks.length === 0 ? (
        <div className="guide-empty"><div className="guide-empty-icon" aria-hidden="true"><LegacyEmptyIllustration kind="tour" /></div><h2 className="guide-empty-title">暂无导览任务</h2><p className="guide-empty-description">新建导览任务后，可在这里查看和管理</p><button className="guide-button guide-button-primary guide-empty-action" type="button" onClick={() => navigate('/tour-tasks/new')}><Plus aria-hidden="true" size={16} strokeWidth={2.2} />新建导览任务</button></div>
      ) : null}
      {taskQuery.isSuccess && tasks.length > 0 ? (
        <><div className="table-wrap guide-table-scroll"><table className="guide-table" aria-label="导览任务列表"><thead className="guide-table-head"><tr className="guide-table-row"><th className="guide-table-header-cell">任务名称</th><th className="guide-table-header-cell">地图名称</th><th className="guide-table-header-cell">点位数量</th><th className="guide-table-header-cell">创建时间</th><th className="guide-table-header-cell guide-table-header-cell-actions actions-column">操作</th></tr></thead><tbody className="guide-table-body">
          {visibleTasks.map((task) => <tr key={task.id} className="guide-table-row guide-table-row-interactive" tabIndex={0} aria-label={`查看任务 ${task.name}`} onClick={() => navigate(`/tour-tasks/${task.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/tour-tasks/${task.id}`) } }}><td className="guide-table-cell guide-table-cell-name task-name" title={task.name}>{task.name}</td><td className="guide-table-cell">{task.mapName}</td><td className="guide-table-cell">{task.pointCount}</td><td className="guide-table-cell">{taskDateFormatter.format(new Date(task.createdAt))}</td><td className="guide-table-cell guide-table-cell-actions actions-cell" onClick={(event) => event.stopPropagation()}><button className="guide-button guide-button-icon" type="button" aria-label={`编辑 ${task.name}`} title="编辑" onClick={() => navigate(`/tour-tasks/${task.id}/edit`)}><Pencil aria-hidden="true" size={16} strokeWidth={1.8} /></button><button className="guide-button guide-button-icon guide-button-icon-danger" type="button" aria-label={`删除 ${task.name}`} title="删除" onClick={(event) => { setDeleteTrigger(event.currentTarget); setDeleteTask(task) }}><Trash2 aria-hidden="true" size={16} strokeWidth={1.8} /></button></td></tr>)}
        </tbody></table></div><TaskPagination page={page} pageCount={pageCount} total={tasks.length} onPageChange={setPage} /></>
      ) : null}
    </section>
  )
}
