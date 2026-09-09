import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleUserRound, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PersonaSummary } from '@guide/contracts'
import { useConfirmModalController, useToastStackController } from '../../ui-adapters'
import { deletePersona, listPersonas, personaQueryKey } from './personas-api'

const personaDateFormatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })

function personaKind(persona: PersonaSummary) {
  return persona.isSystemDefault ? '系统默认' : '自定义'
}

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

  const personas = personasQuery.data?.items ?? []

  return (
    <section className="page-section" aria-labelledby="personas-title">
      <div className="page-heading">
        <div>
          <h1 id="personas-title">人设管理</h1>
          <p className="page-summary">管理导览机器人使用的语音人设、表达规则与自定义技能。</p>
        </div>
        <button className="guide-button guide-button-primary" type="button" onClick={() => navigate('/voice/personas/new')}>
          <Plus aria-hidden="true" size={16} strokeWidth={2.2} />
          新建人设
        </button>
      </div>
      {personasQuery.isLoading ? <div className="state-panel">正在加载人设</div> : null}
      {personasQuery.isError ? <div className="state-panel state-error">暂时无法加载人设，请检查本地服务。</div> : null}
      {personasQuery.isSuccess && personas.length === 0 ? (
        <div className="guide-empty">
          <div className="guide-empty-icon" aria-hidden="true"><CircleUserRound size={42} strokeWidth={1.35} /></div>
          <h2 className="guide-empty-title">暂无自定义人设</h2>
          <p className="guide-empty-description">创建人设，为导览任务配置稳定的表达风格和技能规则。</p>
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
                <th className="guide-table-header-cell">音色</th>
                <th className="guide-table-header-cell">类型</th>
                <th className="guide-table-header-cell">更新时间</th>
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
                  <td className="guide-table-cell">{persona.voice === 'female' ? '女声' : persona.voice === 'male' ? '男声' : persona.voice}</td>
                  <td className="guide-table-cell">
                    <span className={`guide-tag guide-tag-${persona.isSystemDefault ? 'info' : 'default'}`}>
                      {persona.isSystemDefault ? <ShieldCheck aria-hidden="true" size={14} strokeWidth={1.8} /> : null}
                      {personaKind(persona)}
                    </span>
                  </td>
                  <td className="guide-table-cell">{personaDateFormatter.format(new Date(persona.updatedAt))}</td>
                  <td className="guide-table-cell guide-table-cell-actions actions-cell" onClick={(event) => event.stopPropagation()}>
                    {!persona.isSystemDefault ? (
                      <>
                        <button className="guide-button guide-button-icon" type="button" title="编辑" aria-label={`编辑 ${persona.name}`} onClick={() => navigate(`/voice/personas/${persona.id}/edit`)}>
                          <Pencil aria-hidden="true" size={16} strokeWidth={1.8} />
                        </button>
                        <button
                          className="guide-button guide-button-icon persona-delete-icon"
                          type="button"
                          title="删除"
                          aria-label={`删除 ${persona.name}`}
                          onClick={(event) => {
                            setDeleteTrigger(event.currentTarget)
                            setPendingDelete(persona)
                          }}
                        >
                          <Trash2 aria-hidden="true" size={16} strokeWidth={1.8} />
                        </button>
                      </>
                    ) : <span className="persona-action-muted">只读</span>}
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
