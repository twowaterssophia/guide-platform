import { CircleUserRound, Map, Wrench } from 'lucide-react'
import type { ComponentType } from 'react'

interface EmptyFeaturePageProps {
  icon: ComponentType<{ 'aria-hidden'?: boolean | 'true' | 'false'; size?: number; strokeWidth?: number }>
  title: string
  summary: string
  emptyTitle: string
  emptyDescription: string
}

export function EmptyFeaturePage({ icon: Icon, title, summary, emptyTitle, emptyDescription }: EmptyFeaturePageProps) {
  return (
    <section className="page-section" aria-labelledby="feature-title">
      <div className="page-heading">
        <div>
          <h1 id="feature-title">{title}</h1>
          <p className="page-summary">{summary}</p>
        </div>
      </div>
      <div className="guide-empty" role="status" aria-live="polite">
        <div className="guide-empty-icon" aria-hidden="true">
          <Icon aria-hidden="true" size={42} strokeWidth={1.35} />
        </div>
        <h2 className="guide-empty-title">{emptyTitle}</h2>
        <p className="guide-empty-description">{emptyDescription}</p>
      </div>
    </section>
  )
}

export function MapsPage() {
  return <EmptyFeaturePage icon={Map} title="地图" summary="管理导览任务使用的地图资产" emptyTitle="暂无地图资产" emptyDescription="地图资产接口尚未接入。完成接口接入后，可在此上传和管理地图。" />
}

export function PersonasPage() {
  return <EmptyFeaturePage icon={CircleUserRound} title="人设管理" summary="管理语音导览使用的人设与表达风格" emptyTitle="暂无语音人设" emptyDescription="人设管理接口尚未接入。完成接口接入后，可在此创建和编辑语音人设。" />
}

export function PluginsPage() {
  return <EmptyFeaturePage icon={Wrench} title="插件管理" summary="管理导览流程可调用的工具与插件" emptyTitle="暂无可用插件" emptyDescription="插件管理接口尚未接入。完成接口接入后，可在此添加和配置插件。" />
}
