import { BookOpen, FolderOpen, Map, MapPinned, Plug, RotateCcw, Route, UserRound } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { resetDemoData } from './demo-data-api'
import { useConfirmModalController, useToastStackController } from '../ui-adapters'
import { RobotIcon } from '../ui/robot-icon'

const operationGuideUrl = 'https://booster.feishu.cn/wiki/T8uaws69pi6dEbkU2L6cUNhonbc'

const navItems = [
  { label: '导览任务', to: '/tour-tasks', icon: Route },
  { label: '机器人', to: '/robots', icon: RobotIcon },
]

const resourceItems = [
  { label: '地图', to: '/maps', icon: Map, prefixes: ['/maps'] },
  { label: '人设', to: '/voice/personas', icon: UserRound, prefixes: ['/voice/personas'] },
  { label: '知识库', to: '/knowledge-bases', icon: BookOpen, prefixes: ['/knowledge-bases'] },
  { label: '插件管理', to: '/voice/plugins', icon: Plug, prefixes: ['/voice/plugins'] },
]

function matchesSection(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function TourSidebar({ pathname }: { pathname: string }) {
  const resourcesActive = resourceItems.some(({ prefixes }) => prefixes.some((prefix) => matchesSection(pathname, prefix)))

  return (
    <nav className="tour-subnav" aria-label="导览任务侧边导航">
      <NavLink to="/tour-tasks"><Route aria-hidden="true" size={17} strokeWidth={1.8} /><span>流程配置</span></NavLink>
      <div
        className={`tour-resource-heading${resourcesActive ? ' is-active' : ''}`}
        id="tour-resource-heading"
      >
        <FolderOpen aria-hidden="true" size={17} strokeWidth={1.8} />
        <span>资源管理</span>
      </div>
      <div className="tour-resource-links" role="group" aria-labelledby="tour-resource-heading">
        {resourceItems.map(({ label, to, icon: Icon, prefixes }) => (
          <Link key={to} to={to} aria-current={prefixes.some((prefix) => matchesSection(pathname, prefix)) ? 'page' : undefined}>
            <Icon aria-hidden="true" size={17} strokeWidth={1.8} /><span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

function AccountMenu() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showToast = useToastStackController()
  const [open, setOpen] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetTrigger, setResetTrigger] = useState<HTMLElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return

    const close = () => {
      setOpen(false)
      triggerRef.current?.focus()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      }
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const resetMutation = useMutation({
    mutationFn: resetDemoData,
    onSuccess: async () => {
      await queryClient.invalidateQueries()
      setConfirmingReset(false)
      setResetTrigger(null)
      navigate('/tour-tasks', { replace: true })
      showToast({ variant: 'success', title: '演示数据已重置', message: '已恢复默认的地图、任务和人设。' })
    },
    onError: () => {
      setConfirmingReset(false)
      setResetTrigger(null)
      showToast({ variant: 'error', title: '重置失败', message: '请稍后重试。' })
    },
  })

  useConfirmModalController({
    open: confirmingReset,
    title: '重置演示数据？',
    description: '当前的地图、导览任务、人设和插件将被删除，并恢复为默认演示数据。',
    trigger: resetTrigger,
    confirmLabel: '确认重置',
    cancelLabel: '取消',
    onConfirm: () => resetMutation.mutate(),
    onCancel: () => {
      setConfirmingReset(false)
      setResetTrigger(null)
    },
  })

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        className="account-button"
        type="button"
        aria-label="打开账号菜单"
        aria-controls="account-menu-content"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="account-avatar" aria-hidden="true">G</span>
      </button>
      {open ? (
        <div className="account-menu-content" id="account-menu-content" role="menu" aria-label="账号菜单">
          <span className="account-menu-email">guide@booster.tech</span>
          <span className="account-menu-divider" aria-hidden="true" />
          <a className="account-menu-item" href={operationGuideUrl} target="_blank" rel="noreferrer" role="menuitem"><BookOpen aria-hidden="true" size={16} strokeWidth={1.7} />操作手册</a>
          <button className="account-menu-item account-menu-item-danger" type="button" role="menuitem" onClick={(event) => { setOpen(false); setResetTrigger(event.currentTarget); setConfirmingReset(true) }}><RotateCcw aria-hidden="true" size={16} strokeWidth={1.7} />重置演示数据</button>
        </div>
      ) : null}
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const isRobotMonitor = /^\/robots\/[^/]+$/.test(location.pathname)
  const isRobotRoute = matchesSection(location.pathname, '/robots')

  if (isRobotMonitor) return <div className="robot-standalone-shell">{children}</div>

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink className="brand" to="/tour-tasks" aria-label="导览后台首页">
          <MapPinned className="brand-mark" aria-hidden="true" size={34} strokeWidth={2.15} />
          <span className="brand-copy">
            <span className="brand-name">GUIDE HUB</span>
          </span>
        </NavLink>
        <nav className="primary-nav" aria-label="主要导航">
          {navItems.map(({ label, to, icon: Icon }) => (
            <Link key={to} className={`nav-link${(to === '/robots' ? isRobotRoute : !isRobotRoute) ? ' is-active' : ''}`} aria-current={(to === '/robots' ? isRobotRoute : !isRobotRoute) ? 'page' : undefined} to={to}>
              <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="account-area">
          <AccountMenu />
        </div>
      </header>
      <main className="page-content">
        {!isRobotRoute ? (
          <div className="tour-layout">
            <TourSidebar key={location.pathname} pathname={location.pathname} />
            <div className="tour-content">{children}</div>
          </div>
        ) : children}
      </main>
    </div>
  )
}
