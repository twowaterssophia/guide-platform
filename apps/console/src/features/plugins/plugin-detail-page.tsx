import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useConfirmModalController, useToastStackController } from '../../ui-adapters'
import { deletePlugin, getPlugin, pluginsQueryKey, refreshPlugin } from './plugins-api'

function getAuthLabel(authType: string) {
  if (authType === 'BEARER') return 'Bearer Token'
  if (authType === 'API_KEY') return 'API Key'
  if (authType === 'BASIC') return 'Basic Auth'
  return '不需要认证'
}

export function PluginDetailPage() {
  const navigate = useNavigate()
  const { pluginId = '' } = useParams()
  const queryClient = useQueryClient()
  const showToast = useToastStackController()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteTrigger, setDeleteTrigger] = useState<HTMLElement | null>(null)
  const detailQuery = useQuery({ queryKey: [...pluginsQueryKey, pluginId], queryFn: () => getPlugin(pluginId), enabled: Boolean(pluginId) })
  const refreshMutation = useMutation({
    mutationFn: () => refreshPlugin(pluginId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pluginsQueryKey })
      showToast({ variant: 'success', title: '工具列表已刷新', message: '插件工具信息已更新。' })
    },
    onError: () => showToast({ variant: 'error', title: '刷新失败', message: '未获取到工具列表，请检查插件地址和认证信息。' }),
  })
  const deleteMutation = useMutation({
    mutationFn: () => deletePlugin(pluginId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pluginsQueryKey })
      showToast({ variant: 'success', title: '插件已删除', message: '人设中的插件关联已同步解除。' })
      navigate('/voice/plugins', { replace: true })
    },
    onError: () => showToast({ variant: 'error', title: '删除失败', message: '请刷新后重试。' }),
  })

  useConfirmModalController({
    open: confirmingDelete,
    title: detailQuery.data ? `确认删除“${detailQuery.data.name}”？` : '',
    description: detailQuery.data?.personaCount ? `当前有 ${detailQuery.data.personaCount} 个人设正在使用此插件，删除后将解除关联。` : '删除后不可恢复。',
    trigger: deleteTrigger,
    onConfirm: () => {
      setConfirmingDelete(false)
      setDeleteTrigger(null)
      deleteMutation.mutate()
    },
    onCancel: () => {
      setConfirmingDelete(false)
      setDeleteTrigger(null)
    },
  })

  if (detailQuery.isLoading) return <section className="page-section"><div className="state-panel">正在加载插件详情</div></section>
  if (detailQuery.isError || !detailQuery.data) return <section className="page-section"><div className="state-panel state-error">无法加载该插件，请返回列表后重试。</div></section>

  const plugin = detailQuery.data
  return <section className="page-section plugin-detail-page" aria-labelledby="plugin-detail-title">
    <div className="page-heading plugin-detail-heading"><div><button className="guide-button guide-button-text editor-back" type="button" onClick={() => navigate('/voice/plugins')}><ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} />返回插件列表</button><h1 id="plugin-detail-title">{plugin.name}</h1></div><div className="detail-heading-actions"><button className={`guide-button guide-button-secondary${refreshMutation.isPending ? ' is-loading' : ''}`} type="button" disabled={refreshMutation.isPending} onClick={() => refreshMutation.mutate()}><RefreshCw aria-hidden="true" size={16} strokeWidth={1.8} />刷新</button><button className="guide-button guide-button-secondary" type="button" onClick={() => navigate(`/voice/plugins/${plugin.id}/edit`)}><Pencil aria-hidden="true" size={16} strokeWidth={1.8} />编辑</button><button className="guide-button guide-button-danger-outline" type="button" onClick={(event) => { setDeleteTrigger(event.currentTarget); setConfirmingDelete(true) }}><Trash2 aria-hidden="true" size={16} strokeWidth={1.8} />删除</button></div></div>
    <div className="plugin-detail-layout"><section className="plugin-detail-section"><dl className="plugin-detail-meta"><div><dt>描述</dt><dd>{plugin.description}</dd></div><div><dt>识别示例</dt><dd>{plugin.examples}</dd></div><div><dt>MCP 服务地址</dt><dd>{plugin.serviceUrl}</dd></div><div><dt>认证方式</dt><dd>{getAuthLabel(plugin.authType)}{plugin.hasCredentials ? '，已配置' : ''}</dd></div>{Object.keys(plugin.customHeaders).length ? <div><dt>自定义请求头</dt><dd><pre>{JSON.stringify(plugin.customHeaders, null, 2)}</pre></dd></div> : null}</dl></section><section className="plugin-detail-section" aria-labelledby="plugin-tools-title"><h2 id="plugin-tools-title">工具列表</h2>{plugin.tools.length ? <ul className="plugin-tool-list">{plugin.tools.map((tool) => <li key={tool.name}><strong>{tool.name}</strong>{tool.description ? <span>{tool.description}</span> : null}</li>)}</ul> : <p className="plugin-empty-copy">尚未发现工具，请检查配置后刷新。</p>}</section></div>
  </section>
}
