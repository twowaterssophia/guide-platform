import { useQuery } from '@tanstack/react-query'
import { Bot, CircleUserRound, Map, MicVocal, Route } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { healthResponseSchema } from '@guide/contracts'
import type { ReactNode } from 'react'
import { getJson } from '../api/client'

const navItems = [
  { label: '导览任务', to: '/tour-tasks', icon: Route },
  { label: '地图', to: '/maps', icon: Map },
  { label: '语音', to: '/voice/personas', icon: MicVocal },
]

function AccountMenu() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
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
        <CircleUserRound aria-hidden="true" size={20} strokeWidth={1.8} />
        <span>guide@booster.tech</span>
      </button>
      {open ? (
        <div className="account-menu-content" id="account-menu-content" role="menu" aria-label="账号菜单">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); navigate('/runtime') }}>
            查看运行状态
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: async () => healthResponseSchema.parse(await getJson('/health')),
    staleTime: 30_000,
  })
  const isVoiceRoute = location.pathname.startsWith('/voice')

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink className="brand" to="/tour-tasks" aria-label="导览后台首页">
          <Bot aria-hidden="true" size={22} strokeWidth={2.25} />
          <span>导览后台</span>
        </NavLink>
        <nav className="primary-nav" aria-label="主要导航">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`} to={to}>
              <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="account-area">
          <span
            className={`connection-dot${healthQuery.isSuccess ? ' is-ready' : healthQuery.isError ? ' is-error' : ''}`}
            title={healthQuery.isSuccess ? '服务已连接' : healthQuery.isError ? '服务未连接' : '正在连接服务'}
            aria-label={healthQuery.isSuccess ? '服务已连接' : healthQuery.isError ? '服务未连接' : '正在连接服务'}
          />
          <AccountMenu />
        </div>
      </header>
      <main className="page-content">
        {isVoiceRoute ? (
          <div className="voice-layout">
            <nav className="voice-subnav" aria-label="语音功能">
              <NavLink to="/voice/personas">人设</NavLink>
              <NavLink to="/voice/plugins">插件</NavLink>
            </nav>
            <div className="voice-content">{children}</div>
          </div>
        ) : children}
      </main>
    </div>
  )
}
