import { useState } from 'react'
import type { AgentTaskPackage, AgentTaskSummary } from '@guide/contracts'
import { deleteTaskPackage, saveTaskPackage } from './resource-storage'
import { mapStillReferenced, normalizeLocalTasks } from './resource-utils'
import { GuideTaskControlDock, type DockTask } from './task-control-dock'
import { TaskLibraryPage } from './task-library-page'

type Screen = 'home' | 'settings' | 'tasks'
type AgentMode = '准备' | '行走'
type GuideState = 'idle' | 'running' | 'paused'
type LocalTask = ReturnType<typeof normalizeLocalTasks>[number]

const taskStorageKey = 'guide.agent.tasks'

function getLocalTasks(): LocalTask[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(taskStorageKey) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return normalizeLocalTasks(parsed)
  } catch {
    return []
  }
}

function persistLocalTasks(tasks: LocalTask[]) {
  window.localStorage.setItem(taskStorageKey, JSON.stringify(tasks))
}

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

function HomeScreen({ mode, onModeChange, guideState, localTasks, onOpenSettings, onOpenTasks, onPause, onNext, onStop, onStart }: { mode: AgentMode; onModeChange: (mode: AgentMode) => void; guideState: GuideState; localTasks: LocalTask[]; onOpenSettings: () => void; onOpenTasks: () => void; onPause: () => void; onNext: () => void; onStop: () => void; onStart: (task: DockTask) => void }) {
  return <main className="app-stage">
    <img className="camera-placeholder" src="/assets/zhengzhou-metro-concourse.jpg" alt="地铁站站厅画面" /><div className="camera-shade" />
    <TopBar onSettings={onOpenSettings} />
    <section className="mode-control" aria-label="机器人模式">
      {(['准备', '行走'] as AgentMode[]).map((item) => <button key={item} className={`mode-button ${mode === item ? 'mode-active' : ''}`} type="button" aria-pressed={mode === item} onClick={() => onModeChange(item)}>{item}</button>)}
    </section>
    <Joystick size="small" label="固定相机操作杆" /><div className="joystick joystick-large joystick-left" aria-label="固定移动操作杆" role="img"><span className="direction direction-up" /><span className="direction direction-right" /><span className="direction direction-down" /><span className="direction direction-left" /><span className="joystick-core" /></div><div className="joystick joystick-large joystick-right" aria-label="固定视角操作杆" role="img"><span className="direction direction-up" /><span className="direction direction-right" /><span className="direction direction-down" /><span className="direction direction-left" /><span className="joystick-core" /></div>
    <GuideTaskControlDock guideState={guideState} tasks={localTasks} onStart={onStart} onOpenTasks={onOpenTasks} onPause={onPause} onNext={onNext} onStop={onStop} />
  </main>
}

function WebPage({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return <section className="web-page" aria-labelledby="web-page-title"><header className="web-page-header"><button className="web-page-close" type="button" aria-label="返回首页" onClick={onBack}><CloseIcon /></button><h1 id="web-page-title">{title}</h1></header><main className="web-page-body">{children}</main></section>
}

function SettingsScreen({ onBack, onTasks }: { onBack: () => void; onTasks: () => void }) {
  return <WebPage title="导览设置" onBack={onBack}><div className="settings-option-list"><button className="settings-option" type="button" onClick={() => undefined}><span className="settings-step-number">1</span><span className="settings-option-copy"><strong>上传地图</strong><small>将机器人本地地图上传到导览后台</small></span><span className="settings-option-arrow"><ArrowIcon /></span></button><div className="settings-option settings-option-info"><span className="settings-step-number">2</span><span className="settings-option-copy"><strong>创建导览任务</strong><small>在电脑端导览后台创建导览任务</small></span></div><button className="settings-option" type="button" onClick={onTasks}><span className="settings-step-number">3</span><span className="settings-option-copy"><strong>添加导览任务</strong><small>将导览后台的任务添加到机器人本地</small></span><span className="settings-option-arrow"><ArrowIcon /></span></button></div></WebPage>
}

export function AgentApp() {
  const [screen, setScreen] = useState<Screen>('home')
  const [mode, setMode] = useState<AgentMode>('行走')
  const [guideState, setGuideState] = useState<GuideState>('idle')
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [, setGuideStep] = useState(1)
  const [syncedTasks, setSyncedTasks] = useState<LocalTask[]>(getLocalTasks)
  const rememberTask = async (task: AgentTaskSummary, pkg: AgentTaskPackage) => {
    await saveTaskPackage(pkg)
    const next = [{ id: task.id, name: task.name, mapName: task.mapName, mapId: pkg.map.id, version: task.downloadedVersion ?? task.remoteVersion }, ...syncedTasks.filter((item) => item.id !== task.id)]
    persistLocalTasks(next)
    setSyncedTasks(next)
  }
  const forgetTask = async (taskId: string) => {
    const removed = syncedTasks.find((item) => item.id === taskId)
    const next = syncedTasks.filter((item) => item.id !== taskId)
    persistLocalTasks(next)
    setSyncedTasks(next)
    if (removed) await deleteTaskPackage(taskId, removed.mapId || null, Boolean(removed.mapId) && mapStillReferenced(next, removed.mapId))
    if (taskId === activeTaskId) {
      setActiveTaskId(null)
      setGuideState('idle')
      setGuideStep(1)
    }
  }
  const startTask = (task: DockTask) => { setActiveTaskId(task.id); setGuideStep(1); setGuideState('running') }
  const stopTask = () => { setActiveTaskId(null); setGuideStep(1); setGuideState('idle') }
  const content = screen === 'settings'
    ? <SettingsScreen onBack={() => setScreen('home')} onTasks={() => setScreen('tasks')} />
    : screen === 'tasks'
      ? <TaskLibraryPage onBack={() => setScreen('home')} onTaskAdded={rememberTask} onTaskRemoved={forgetTask} />
      : <HomeScreen mode={mode} onModeChange={setMode} guideState={guideState} localTasks={syncedTasks} onOpenSettings={() => setScreen('settings')} onOpenTasks={() => setScreen('tasks')} onPause={() => setGuideState((value) => value === 'paused' ? 'running' : 'paused')} onNext={() => setGuideStep((value) => value + 1)} onStop={stopTask} onStart={startTask} />
  return <div className="app-viewport">{content}</div>
}
