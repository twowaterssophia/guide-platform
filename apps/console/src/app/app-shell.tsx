import { useQuery } from '@tanstack/react-query'
import { Bot, CircleUserRound, Map, MicVocal, Route } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { healthResponseSchema } from '@guide/contracts'
import type { ReactNode } from 'react'
import { getJson } from '../api/client'

const navItems = [
  { label: '导览任务', to: '/tour-tasks', icon: Route },
  { label: '地图', to: '/maps', icon: Map },
  { label: '语音', to: '/voice/personas', icon: MicVocal },
]

export function AppShell({ children }: { children: ReactNode }) {
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: async () => healthResponseSchema.parse(await getJson('/health')),
    staleTime: 30_000,
  })

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
          <button className="account-button" type="button" aria-label="打开账号菜单">
            <CircleUserRound aria-hidden="true" size={20} strokeWidth={1.8} />
            <span>guide@booster.tech</span>
          </button>
        </div>
      </header>
      <main className="page-content">{children}</main>
    </div>
  )
}
