import { useState } from 'react'

type Screen = 'home' | 'settings' | 'tasks'
type AgentMode = '准备' | '行走'
type GuideState = 'idle' | 'running' | 'paused'

const localTasks = [
  { id: 'local-demo-tour', name: '本地演示任务', mapName: '王府井站站厅', version: 1 },
]

function AppIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19.5V8.8a7 7 0 0 1 14 0v10.7" /><path d="M8.2 19.5v-5.6a3.8 3.8 0 0 1 7.6 0v5.6" /><path d="M12 4.5v4.1M10.1 15.5h.01M13.9 15.5h.01" /></svg>
}

function SettingsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.2 2.2-.1-.1a1.7 1.7 0 0 0-1.9-.3l-.6.3a1.7 1.7 0 0 0-1 1.5v.2h-3v-.2a1.7 1.7 0 0 0-1-1.5l-.6-.3a1.7 1.7 0 0 0-1.9.3l-.1.1-2.2-2.2.1-.1a1.7 1.7 0 0 0 .3-1.9l-.3-.6a1.7 1.7 0 0 0-1.5-1H3.6v-3h.2a1.7 1.7 0 0 0 1.5-1l.3-.6a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.2-2.2.1.1a1.7 1.7 0 0 0 1.9.3l.6-.3a1.7 1.7 0 0 0 1-1.5v-.2h3v.2a1.7 1.7 0 0 0 1 1.5l.6.3a1.7 1.7 0 0 0 1.9-.3l.1-.1 2.2 2.2-.1.1a1.7 1.7 0 0 0-.3 1.9l.3.6a1.7 1.7 0 0 0 1.5 1h.2v3h-.2a1.7 1.7 0 0 0-1.5 1Z" /></svg>
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 5 19 19M19 5 5 19" /></svg>
}

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="m9 5 7 7-7 7" /></svg>
}

function ActionIcon({ kind }: { kind: 'pause' | 'play' | 'next' | 'stop' | 'plus' }) {
  if (kind === 'pause') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M8 5v14M16 5v14" /></svg>
  if (kind === 'play') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m8 5 10 7-10 7V5Z" /></svg>
  if (kind === 'next') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m5 5 8 7-8 7V5ZM19 5v14" /></svg>
  if (kind === 'stop') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="7" width="10" height="10" rx="1" /></svg>
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
}

function Joystick({ size = 'large', label }: { size?: 'small' | 'large'; label: string }) {
  return <div className={`joystick joystick-${size}`} aria-label={label} role="img"><span className="direction direction-up" /><span className="direction direction-right" /><span className="direction direction-down" /><span className="direction direction-left" /><span className="joystick-core" /></div>
}

function TopBar({ onSettings }: { onSettings: () => void }) {
  return <header className="system-header">
    <button className="agent-switcher" type="button" aria-label="当前 Agent 导览">
      <span className="agent-avatar"><AppIcon /></span><span className="agent-name">导览</span><span className="agent-separator" /><span className="switch-icon">↕</span>
    </button>
    <div className="system-status" aria-label="机器人状态">
      <span className="emergency-status"><span className="emergency-mark">×</span>急停</span>
      <span className="battery-status">97</span><span className="system-health" aria-label="机器人状态正常">⌁</span><span className="status-divider" />
      <button className="system-icon" type="button" aria-label="打开设置" onClick={onSettings}><SettingsIcon /></button>
      <span className="system-icon close-icon" aria-label="关闭"><CloseIcon /></span>
    </div>
  </header>
}

function ActionButton({ label, kind, tone = 'default', onClick }: { label: string; kind: 'pause' | 'play' | 'next' | 'stop' | 'plus'; tone?: 'default' | 'danger'; onClick?: () => void }) {
  return <button className={`agent-action ${tone === 'danger' ? 'agent-action-stop' : ''}`} type="button" aria-label={label} onClick={onClick}><span className="agent-action-icon"><ActionIcon kind={kind} /></span><span>{label}</span></button>
}

function HomeScreen({ mode, onModeChange, guideState, activeTask, onOpenSettings, onOpenTasks, onPause, onNext, onStop, onStart }: { mode: AgentMode; onModeChange: (mode: AgentMode) => void; guideState: GuideState; activeTask: string | null; onOpenSettings: () => void; onOpenTasks: () => void; onPause: () => void; onNext: () => void; onStop: () => void; onStart: (taskName: string) => void }) {
  const running = guideState !== 'idle'
  const taskButtons = running ? [] : localTasks
  return <main className="app-stage">
    <img className="camera-placeholder" src="/assets/camera-placeholder.svg" alt="实时相机画面占位图" /><div className="camera-shade" />
    <TopBar onSettings={onOpenSettings} />
    <section className="mode-control" aria-label="机器人模式">
      {(['准备', '行走'] as AgentMode[]).map((item) => <button key={item} className={`mode-button ${mode === item ? 'mode-active' : ''}`} type="button" aria-pressed={mode === item} onClick={() => onModeChange(item)}>{item}</button>)}
    </section>
    <Joystick size="small" label="固定相机操作杆" /><div className="joystick joystick-large joystick-left" aria-label="固定移动操作杆" role="img"><span className="direction direction-up" /><span className="direction direction-right" /><span className="direction direction-down" /><span className="direction direction-left" /><span className="joystick-core" /></div><div className="joystick joystick-large joystick-right" aria-label="固定视角操作杆" role="img"><span className="direction direction-up" /><span className="direction direction-right" /><span className="direction direction-down" /><span className="direction direction-left" /><span className="joystick-core" /></div>
    <section className="agent-action-dock" aria-label="Agent 动作区域">
      {running ? <><ActionButton label={guideState === 'paused' ? '继续' : '暂停'} kind={guideState === 'paused' ? 'play' : 'pause'} onClick={onPause} /><ActionButton label="下个环节" kind="next" onClick={onNext} /><ActionButton label="结束" kind="stop" tone="danger" onClick={onStop} /></> : <div className="guide-task-actions">{taskButtons.map((task) => <ActionButton key={task.id} label={task.name} kind="next" onClick={() => onStart(task.name)} />)}</div>}
      {!running && <ActionButton label="添加导览任务" kind="plus" onClick={onOpenTasks} />}
      {running && <span className="active-task-label">正在执行：{activeTask}</span>}
    </section>
  </main>
}

function WebPage({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return <section className="web-page" aria-labelledby="web-page-title"><header className="web-page-header"><button className="web-page-close" type="button" aria-label="返回首页" onClick={onBack}><CloseIcon /></button><h1 id="web-page-title">{title}</h1></header><main className="web-page-body">{children}</main></section>
}

function SettingsScreen({ onBack, onTasks }: { onBack: () => void; onTasks: () => void }) {
  return <WebPage title="导览设置" onBack={onBack}><div className="settings-option-list"><button className="settings-option" type="button" onClick={() => undefined}><span className="settings-step-number">1</span><span className="settings-option-copy"><strong>上传地图</strong><small>将机器人本地地图上传到导览后台</small></span><span className="settings-option-arrow"><ArrowIcon /></span></button><div className="settings-option settings-option-info"><span className="settings-step-number">2</span><span className="settings-option-copy"><strong>创建导览任务</strong><small>在电脑端导览后台创建导览任务</small></span></div><button className="settings-option" type="button" onClick={onTasks}><span className="settings-step-number">3</span><span className="settings-option-copy"><strong>添加导览任务</strong><small>将导览后台的任务添加到机器人本地</small></span><span className="settings-option-arrow"><ArrowIcon /></span></button></div><p className="page-note">任务同步接口将在 AGENT-002 接入，当前页面不会伪造云端状态。</p></WebPage>
}

function TaskScreen({ onBack }: { onBack: () => void }) {
  return <WebPage title="添加导览任务" onBack={onBack}><div className="sync-state"><div className="sync-icon">⌁</div><h2>等待任务同步接口</h2><p>已发布任务列表、地图包下载和设备记录将在 AGENT-002 接入。</p><button className="resource-button" type="button" disabled>暂不可添加</button></div></WebPage>
}

export function AgentApp() {
  const [screen, setScreen] = useState<Screen>('home')
  const [mode, setMode] = useState<AgentMode>('行走')
  const [guideState, setGuideState] = useState<GuideState>('idle')
  const [activeTask, setActiveTask] = useState<string | null>(null)
  const startTask = (name: string) => { setActiveTask(name); setGuideState('running') }
  const stopTask = () => { setActiveTask(null); setGuideState('idle') }
  if (screen === 'settings') return <div className="app-viewport"><SettingsScreen onBack={() => setScreen('home')} onTasks={() => setScreen('tasks')} /></div>
  if (screen === 'tasks') return <div className="app-viewport"><TaskScreen onBack={() => setScreen('home')} /></div>
  return <div className="app-viewport"><HomeScreen mode={mode} onModeChange={setMode} guideState={guideState} activeTask={activeTask} onOpenSettings={() => setScreen('settings')} onOpenTasks={() => setScreen('tasks')} onPause={() => setGuideState((value) => value === 'paused' ? 'running' : 'paused')} onNext={() => undefined} onStop={stopTask} onStart={startTask} /></div>
}
