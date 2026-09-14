import { useEffect, useMemo, useState } from 'react'
import type { AgentTaskPackage, AgentTaskSummary } from '@guide/contracts'
import { AgentApiError, downloadAgentTask, listAgentTasks, removeAgentTask } from './agent-api'

const deviceStorageKey = 'guide.agent.deviceId'

function getDeviceId() {
  const stored = window.localStorage.getItem(deviceStorageKey)
  if (stored) return stored
  const created = `agent-${crypto.randomUUID()}`
  window.localStorage.setItem(deviceStorageKey, created)
  return created
}

function BackIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14.5 5-7 7 7 7M7.5 12h11" /></svg>
}

function RefreshIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 8.5V5l-2.1 2.1A7.2 7.2 0 1 0 19.2 15" /><path d="M19 5v3.5h-3.5" /></svg>
}

function MoreIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
}

function TaskRouteIcon() {
  return <svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M11 11h13l5 5h8v20H24l-5-5H11V11Z" /><path d="M18 21h12M18 27h8" /><circle cx="17" cy="21" r="1.8" fill="currentColor" stroke="none" /><circle cx="17" cy="27" r="1.8" fill="currentColor" stroke="none" /><path d="M32 28v8m-4-4h8" /></svg>
}

function syncLabel(task: AgentTaskSummary) {
  if (task.syncState === 'DOWNLOADED') return '已添加'
  if (task.syncState === 'UPDATE_AVAILABLE') return '更新'
  return '添加'
}

function TaskLibraryState({ title, detail, retry }: { title: string; detail?: string; retry?: () => void }) {
  return <div className="task-library-state">
    <span className="task-library-state-icon"><TaskRouteIcon /></span>
    <strong>{title}</strong>
    {detail ? <p>{detail}</p> : null}
    {retry ? <button className="task-library-retry" type="button" onClick={retry}>重新获取</button> : null}
  </div>
}

function TaskCard({ task, busy, onAdd, onRemove }: { task: AgentTaskSummary; busy: boolean; onAdd: () => void; onRemove: () => void }) {
  const local = task.syncState === 'DOWNLOADED'
  const metadata = `${task.mapName} · ${task.pointCount} 个点位`

  return <article className={`task-library-card ${local ? 'is-local' : ''}`}>
    <span className="task-library-card-icon"><TaskRouteIcon /></span>
    <div className="task-library-card-copy">
      <strong title={task.name}>{task.name}</strong>
      <span>{metadata}</span>
    </div>
    <div className="task-library-card-action">
      {local ? <>
        <span className="task-library-added">已添加</span>
        <button className="task-library-icon-button task-library-delete" type="button" title="删除任务" aria-label={`删除${task.name}`} disabled={busy} onClick={onRemove}><MoreIcon /></button>
      </> : <button className="task-library-command" type="button" disabled={busy} onClick={onAdd}>{busy ? '添加中' : syncLabel(task)}</button>}
    </div>
  </article>
}

export function TaskLibraryPage({ onBack, onTaskAdded, onTaskRemoved }: { onBack: () => void; onTaskAdded: (task: AgentTaskSummary, pkg: AgentTaskPackage) => Promise<void>; onTaskRemoved: (taskId: string) => Promise<void> }) {
  const deviceId = useMemo(getDeviceId, [])
  const [tasks, setTasks] = useState<AgentTaskSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [pendingRemoval, setPendingRemoval] = useState<AgentTaskSummary | null>(null)

  const refresh = async () => {
    setLoading(true)
    setNotice('')
    try {
      setTasks((await listAgentTasks(deviceId)).items)
      setLoadError(false)
    } catch (error) {
      setLoadError(true)
      setNotice(error instanceof AgentApiError ? error.message : '无法连接导览后台，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  const handleAdd = async (task: AgentTaskSummary) => {
    if (task.syncState === 'DOWNLOADED') return
    setBusyTaskId(task.id)
    setNotice('正在添加导览任务')
    try {
      const downloaded = await downloadAgentTask(task.id, deviceId)
      const next: AgentTaskSummary = { ...task, downloadedVersion: downloaded.synchronizedVersion, syncState: 'DOWNLOADED' }
      setTasks((items) => items.map((item) => item.id === task.id ? next : item))
      await onTaskAdded(next, downloaded)
      setNotice('添加成功')
    } catch (error) {
      setNotice(error instanceof AgentApiError ? error.message : '任务添加失败，请稍后重试')
    } finally {
      setBusyTaskId(null)
    }
  }

  const handleRemove = async (task: AgentTaskSummary) => {
    setBusyTaskId(task.id)
    setNotice('正在删除导览任务')
    try {
      await removeAgentTask(task.id, deviceId)
      setTasks((items) => items.map((item) => item.id === task.id ? { ...item, downloadedVersion: null, syncState: 'AVAILABLE' } : item))
      await onTaskRemoved(task.id)
      setPendingRemoval(null)
      setNotice('导览任务已删除')
    } catch (error) {
      setNotice(error instanceof AgentApiError ? error.message : '删除失败，请稍后重试')
    } finally {
      setBusyTaskId(null)
    }
  }

  return <section className="task-library-page" aria-labelledby="task-library-title">
    <header className="task-library-header">
      <button className="task-library-back" type="button" aria-label="返回首页" title="返回首页" onClick={onBack}><BackIcon /></button>
      <h1 id="task-library-title">添加导览任务</h1>
      <button className="task-library-refresh" type="button" aria-label="重新获取任务" title="重新获取任务" disabled={loading} onClick={() => void refresh()}><RefreshIcon /></button>
    </header>
    <main className="task-library-body">
      {notice ? <div className="task-library-notice" role="status">{notice}</div> : null}
      {loading ? <TaskLibraryState title="正在获取导览任务" />
        : loadError ? <TaskLibraryState title="无法连接导览后台" detail="请检查网络后重新获取。" retry={() => void refresh()} />
          : tasks.length === 0 ? <TaskLibraryState title="暂无可添加任务" detail="请先在导览后台创建任务。" retry={() => void refresh()} />
            : <div className="task-library-grid">{tasks.map((task) => <TaskCard key={task.id} task={task} busy={busyTaskId === task.id} onAdd={() => void handleAdd(task)} onRemove={() => setPendingRemoval(task)} />)}</div>}
    </main>
    {pendingRemoval ? <div className="task-library-confirm-backdrop" role="presentation">
      <section className="task-library-confirm" role="dialog" aria-modal="true" aria-labelledby="remove-task-title">
        <h2 id="remove-task-title">删除导览任务</h2>
        <p>确认删除“{pendingRemoval.name}”？本地任务包和未被其他任务引用的地图会一并清理。</p>
        <div>
          <button type="button" onClick={() => setPendingRemoval(null)}>取消</button>
          <button className="is-danger" type="button" disabled={busyTaskId === pendingRemoval.id} onClick={() => void handleRemove(pendingRemoval)}>确认删除</button>
        </div>
      </section>
    </div> : null}
  </section>
}
