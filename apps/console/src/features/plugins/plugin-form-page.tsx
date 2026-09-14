import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import type { McpPluginDetail } from '@guide/contracts'
import { ApiClientError } from '../../api/client'
import { useToastStackController } from '../../ui-adapters'
import { emptyPluginDraft, PluginForm } from './plugin-form'
import { createPlugin, getPlugin, pluginsQueryKey, updatePlugin } from './plugins-api'

function draftFromPlugin(plugin: McpPluginDetail) {
  return {
    name: plugin.name,
    description: plugin.description,
    examples: plugin.examples,
    serviceUrl: plugin.serviceUrl,
    authType: plugin.authType,
    credentials: {},
    keepExistingCredentials: plugin.hasCredentials,
    customHeaders: plugin.customHeaders,
  }
}

export function PluginFormPage() {
  const navigate = useNavigate()
  const { pluginId } = useParams()
  const isEditing = Boolean(pluginId)
  const queryClient = useQueryClient()
  const showToast = useToastStackController()
  const detailQuery = useQuery({ queryKey: [...pluginsQueryKey, pluginId], queryFn: () => getPlugin(pluginId ?? ''), enabled: isEditing })
  const saveMutation = useMutation({
    mutationFn: (input: typeof emptyPluginDraft) => isEditing ? updatePlugin(pluginId ?? '', input) : createPlugin(input),
    onSuccess: async (plugin) => {
      await queryClient.invalidateQueries({ queryKey: pluginsQueryKey })
      showToast({ variant: 'success', title: '插件已保存', message: '插件配置已保存。' })
      navigate(`/voice/plugins/${plugin.id}`, { replace: true })
    },
    onError: (reason) => showToast({ variant: 'error', title: '保存失败', message: reason instanceof ApiClientError ? reason.message : '请检查填写内容后重试。' }),
  })

  if (isEditing && detailQuery.isLoading) return <section className="page-section"><div className="state-panel">正在加载插件</div></section>
  if (isEditing && (detailQuery.isError || !detailQuery.data)) return <section className="page-section"><div className="state-panel state-error">无法加载该插件，请返回列表后重试。</div></section>

  const initial = detailQuery.data ? draftFromPlugin(detailQuery.data) : emptyPluginDraft
  const returnTo = isEditing && pluginId ? `/voice/plugins/${pluginId}` : '/voice/plugins'
  return <section className="page-section plugin-form-page" aria-labelledby="plugin-form-title">
    <div className="page-heading plugin-form-heading"><div><button className="guide-button guide-button-text editor-back" type="button" onClick={() => navigate(returnTo)}><ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} />{isEditing ? '返回插件详情' : '返回插件列表'}</button><h1 id="plugin-form-title">{isEditing ? '编辑插件' : '添加插件'}</h1><p className="page-summary">配置机器人在语音问答中可调用的外部知识和服务。</p></div></div>
    <div className="plugin-form-surface"><PluginForm key={pluginId ?? 'new'} initial={initial} existingHasCredentials={Boolean(detailQuery.data?.hasCredentials)} onSave={(draft) => saveMutation.mutate(draft)} onCancel={() => navigate(returnTo)} pending={saveMutation.isPending} /></div>
  </section>
}
