import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { McpPluginSummary } from '@guide/contracts'
import { useConfirmModalController, useToastStackController } from '../../ui-adapters'
import { LegacyEmptyIllustration } from '../../ui/legacy-empty-illustration'
import { deletePlugin, listPlugins, pluginsQueryKey, refreshPlugin } from './plugins-api'

const pluginDateFormatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })

export function PluginsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showToast = useToastStackController()
  const [pendingDelete, setPendingDelete] = useState<McpPluginSummary | null>(null)
  const [deleteTrigger, setDeleteTrigger] = useState<HTMLElement | null>(null)
  const listQuery = useQuery({ queryKey: pluginsQueryKey, queryFn: listPlugins })
  const refreshMutation = useMutation({
    mutationFn: refreshPlugin,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pluginsQueryKey })
      showToast({ variant: 'success', title: '工具列表已刷新', message: '插件工具信息已更新。' })
    },
    onError: () => showToast({ variant: 'error', title: '刷新失败', message: '未获取到工具列表，请检查插件地址和认证信息。' }),
  })
  const deleteMutation = useMutation({
    mutationFn: deletePlugin,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pluginsQueryKey })
      setPendingDelete(null)
      setDeleteTrigger(null)
      showToast({ variant: 'success', title: '插件已删除', message: '人设中的插件关联已同步解除。' })
    },
    onError: () => showToast({ variant: 'error', title: '删除失败', message: '请刷新后重试。' }),
  })

  useConfirmModalController({
    open: Boolean(pendingDelete),
    title: pendingDelete ? `确认删除“${pendingDelete.name}”？` : '',
    description: '删除后将解除人设中的插件关联，此操作不可恢复。',
    trigger: deleteTrigger,
    onConfirm: () => pendingDelete && deleteMutation.mutate(pendingDelete.id),
    onCancel: () => {
      setPendingDelete(null)
      setDeleteTrigger(null)
    },
  })

  const plugins = listQuery.data?.items ?? []
  const showHeaderAction = !listQuery.isSuccess || plugins.length > 0
  return <section className="page-section" aria-labelledby="plugins-title">
    <div className="page-heading"><div><h1 id="plugins-title">插件</h1><p className="page-summary">管理人设可使用的插件</p></div>{showHeaderAction ? <button className="guide-button guide-button-primary" type="button" onClick={() => navigate('/voice/plugins/new')}><Plus aria-hidden="true" size={16} />添加插件</button> : null}</div>
    {listQuery.isLoading ? <div className="state-panel">正在加载插件</div> : null}
    {listQuery.isError ? <div className="state-panel state-error">暂时无法加载插件，请检查本地服务。</div> : null}
    {listQuery.isSuccess && plugins.length === 0 ? <div className="guide-empty plugin-empty"><div className="guide-empty-icon plugin-empty-icon"><LegacyEmptyIllustration kind="plugin" /></div><h2 className="guide-empty-title">暂无插件</h2><p className="guide-empty-description">添加插件后，机器人可在语音问答中调用外部知识和服务。</p><button className="guide-button guide-button-primary guide-empty-action" type="button" onClick={() => navigate('/voice/plugins/new')}><Plus aria-hidden="true" size={16} />添加插件</button></div> : null}
    {plugins.length > 0 ? <div className="table-wrap guide-table-scroll"><table className="guide-table" aria-label="插件列表"><thead className="guide-table-head"><tr className="guide-table-row"><th className="guide-table-header-cell">插件名称</th><th className="guide-table-header-cell">工具名称</th><th className="guide-table-header-cell">创建时间</th><th className="guide-table-header-cell">最后刷新时间</th><th className="guide-table-header-cell guide-table-header-cell-actions actions-column">操作</th></tr></thead><tbody className="guide-table-body">{plugins.map((plugin) => <tr className="guide-table-row guide-table-row-interactive" key={plugin.id} tabIndex={0} onClick={() => navigate(`/voice/plugins/${plugin.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/voice/plugins/${plugin.id}`) } }}><td className="guide-table-cell guide-table-cell-name task-name">{plugin.name}</td><td className="guide-table-cell">{plugin.tools.length ? plugin.tools.map((tool) => <span className="guide-tag guide-tag-default plugin-tool-tag" key={tool.name}>{tool.name}</span>) : '暂无工具'}</td><td className="guide-table-cell">{pluginDateFormatter.format(new Date(plugin.createdAt))}</td><td className="guide-table-cell">{plugin.lastRefreshedAt ? pluginDateFormatter.format(new Date(plugin.lastRefreshedAt)) : '尚未刷新'}</td><td className="guide-table-cell guide-table-cell-actions actions-cell" onClick={(event) => event.stopPropagation()}><button className="guide-button guide-button-icon" type="button" aria-label={`刷新 ${plugin.name}`} title="刷新" onClick={() => refreshMutation.mutate(plugin.id)}><RefreshCw aria-hidden="true" size={16} strokeWidth={1.8} /></button><button className="guide-button guide-button-icon" type="button" aria-label={`编辑 ${plugin.name}`} title="编辑" onClick={() => navigate(`/voice/plugins/${plugin.id}/edit`)}><Pencil aria-hidden="true" size={16} strokeWidth={1.8} /></button><button className="guide-button guide-button-icon guide-button-icon-danger" type="button" aria-label={`删除 ${plugin.name}`} title="删除" onClick={(event) => { setDeleteTrigger(event.currentTarget); setPendingDelete(plugin) }}><Trash2 aria-hidden="true" size={16} strokeWidth={1.8} /></button></td></tr>)}</tbody></table></div> : null}
  </section>
}
