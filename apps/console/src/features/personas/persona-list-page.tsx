import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PersonaSummary } from '@guide/contracts'
import { useConfirmModalController, useToastStackController } from '../../ui-adapters'
import { LegacyEmptyIllustration } from '../../ui/legacy-empty-illustration'
import { deletePersona, listPersonas, personaQueryKey } from './personas-api'

const personaDateFormatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })

export function PersonaListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showToast = useToastStackController()
  const [pendingDelete, setPendingDelete] = useState<PersonaSummary | null>(null)
  const [deleteTrigger, setDeleteTrigger] = useState<HTMLElement | null>(null)
  const personasQuery = useQuery({ queryKey: personaQueryKey, queryFn: listPersonas })
  const deleteMutation = useMutation({
    mutationFn: deletePersona,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: personaQueryKey })
      showToast({ variant: 'success', title: '已删除人设', message: '关联任务已回退到系统默认人设。' })
    },
    onError: () => {
      showToast({ variant: 'error', title: '删除失败', message: '请刷新后重试。' })
    },
  })

  const confirmDelete = () => {
    const persona = pendingDelete
    setPendingDelete(null)
    setDeleteTrigger(null)
    if (persona) deleteMutation.mutate(persona.id)
  }

  useConfirmModalController({
    open: Boolean(pendingDelete),
    title: pendingDelete ? `确认删除“${pendingDelete.name}”？` : '',
    description: pendingDelete ? '已关联导览任务将自动回退到系统默认人设。此操作不可撤销。' : undefined,
    trigger: deleteTrigger,
    onConfirm: confirmDelete,
    onCancel: () => {
      setPendingDelete(null)
      setDeleteTrigger(null)
    },
  })

  const personas = (personasQuery.data?.items ?? []).filter((persona) => !persona.isSystemDefault)
  const showHeaderAction = !personasQuery.isSuccess || personas.length > 0

  return (
    <section className="page-section" aria-labelledby="personas-title">
      <div className="page-heading">
        <div>
          <h1 id="personas-title">人设</h1>
          <p className="page-summary">设置导览时机器人的说话方式</p>
        </div>
        <div className="page-heading-actions">
          {showHeaderAction ? <button className="guide-button guide-button-primary" type="button" onClick={() => navigate('/voice/personas/new')}>
            <Plus aria-hidden="true" size={16} strokeWidth={2.2} />
            新建人设
          </button> : null}
        </div>
      </div>
      {personasQuery.isLoading ? <div className="state-panel">正在加载人设</div> : null}
      {personasQuery.isError ? <div className="state-panel state-error">暂时无法加载人设，请检查本地服务。</div> : null}
      {personasQuery.isSuccess && personas.length === 0 ? (
        <div className="guide-empty">
          <div className="guide-empty-icon" aria-hidden="true"><LegacyEmptyIllustration kind="persona" /></div>
          <h2 className="guide-empty-title">暂无人设</h2>
          <p className="guide-empty-description">新建人设后，可在导览任务中使用</p>
          <button className="guide-button guide-button-primary guide-empty-action" type="button" onClick={() => navigate('/voice/personas/new')}>
            <Plus aria-hidden="true" size={16} strokeWidth={2.2} />
            新建人设
          </button>
        </div>
      ) : null}
      {personasQuery.isSuccess && personas.length > 0 ? (
        <div className="table-wrap guide-table-scroll">
          <table className="guide-table" aria-label="人设列表">
            <thead className="guide-table-head">
              <tr className="guide-table-row">
                <th className="guide-table-header-cell">名称</th>
                <th className="guide-table-header-cell">创建时间</th>
                <th className="guide-table-header-cell guide-table-header-cell-actions actions-column">操作</th>
              </tr>
            </thead>
            <tbody className="guide-table-body">
              {personas.map((persona) => (
                <tr
                  key={persona.id}
                  className="guide-table-row guide-table-row-interactive"
                  tabIndex={0}
                  aria-label={`查看人设 ${persona.name}`}
                  onClick={() => navigate(`/voice/personas/${persona.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      navigate(`/voice/personas/${persona.id}`)
                    }
                  }}
                >
                  <td className="guide-table-cell guide-table-cell-name task-name">{persona.name}</td>
                  <td className="guide-table-cell">{personaDateFormatter.format(new Date(persona.createdAt))}</td>
                  <td className="guide-table-cell guide-table-cell-actions actions-cell" onClick={(event) => event.stopPropagation()}>
                    <button className="guide-button guide-button-icon" type="button" aria-label={`编辑 ${persona.name}`} title="编辑" onClick={() => navigate(`/voice/personas/${persona.id}/edit`)}><Pencil aria-hidden="true" size={16} strokeWidth={1.8} /></button>
                    <button className="guide-button guide-button-icon guide-button-icon-danger" type="button" aria-label={`删除 ${persona.name}`} title="删除" onClick={(event) => { setDeleteTrigger(event.currentTarget); setPendingDelete(persona) }}><Trash2 aria-hidden="true" size={16} strokeWidth={1.8} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
