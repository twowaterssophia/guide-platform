type GuideState = 'idle' | 'running' | 'paused'

export type DockTask = {
  id: string
  name: string
}

type ActionKind = 'pause' | 'play' | 'next' | 'stop' | 'add' | 'route'

function DockIcon({ kind }: { kind: ActionKind }) {
  const props = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  if (kind === 'pause') return <svg {...props}><path d="M8 5v14M16 5v14" /></svg>
  if (kind === 'play') return <svg {...props}><path d="m8 5 10 7-10 7V5Z" /></svg>
  if (kind === 'next') return <svg {...props}><path d="m5 5 8 7-8 7V5ZM19 5v14" /></svg>
  if (kind === 'stop') return <svg {...props}><rect x="7" y="7" width="10" height="10" rx="1" /></svg>
  if (kind === 'add') return <svg {...props}><path d="M12 5v14M5 12h14" /></svg>
  return <svg {...props}><path d="M5 5.5h6.8l2.8 2.8H19v10.2H5V5.5Z" /><path d="M8.3 11h7.4M8.3 14.5h5" /><circle cx="8.3" cy="8.5" r=".8" fill="currentColor" stroke="none" /></svg>
}

function DockAction({ label, kind, tone = 'default', onClick }: { label: string; kind: ActionKind; tone?: 'default' | 'danger'; onClick: () => void }) {
  return <button className={`agent-action ${tone === 'danger' ? 'agent-action-stop' : ''}`} type="button" aria-label={label} onClick={onClick}>
    <span className="agent-action-icon"><DockIcon kind={kind} /></span>
    <span>{label}</span>
  </button>
}

export function GuideTaskControlDock({ guideState, tasks, onStart, onOpenTasks, onPause, onNext, onStop }: {
  guideState: GuideState
  tasks: DockTask[]
  onStart: (task: DockTask) => void
  onOpenTasks: () => void
  onPause: () => void
  onNext: () => void
  onStop: () => void
}) {
  const isExecuting = guideState !== 'idle'

  return <section className="agent-action-dock" aria-label="Agent 动作区域">
    {isExecuting ? <>
      <DockAction label={guideState === 'paused' ? '继续' : '暂停'} kind={guideState === 'paused' ? 'play' : 'pause'} onClick={onPause} />
      <DockAction label="下个环节" kind="next" onClick={onNext} />
      <DockAction label="结束" kind="stop" tone="danger" onClick={onStop} />
    </> : <>
      <div className="guide-task-actions" aria-label="已获取导览任务">
        {tasks.map((task) => <DockAction key={task.id} label={task.name} kind="route" onClick={() => onStart(task)} />)}
      </div>
      <DockAction label="添加导览任务" kind="add" onClick={onOpenTasks} />
    </>}
  </section>
}
