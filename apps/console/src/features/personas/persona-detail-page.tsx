import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useConfirmModalController, useToastStackController } from '../../ui-adapters'
import { deletePersona, getPersona, personaQueryKey } from './personas-api'

export function PersonaDetailPage() {
  const navigate = useNavigate()
  const { personaId = '' } = useParams()
  const queryClient = useQueryClient()
  const showToast = useToastStackController()
  const [deleteTrigger, setDeleteTrigger] = useState<HTMLElement | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const personaQuery = useQuery({ queryKey: [...personaQueryKey, personaId], queryFn: () => getPersona(personaId), enabled: Boolean(personaId) })
  const deleteMutation = useMutation({
    mutationFn: () => deletePersona(personaId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: personaQueryKey })
      showToast({ variant: 'success', title: '已删除人设', message: '关联任务已回退到系统默认人设。' })
      navigate('/voice/personas', { replace: true })
    },
    onError: () => showToast({ variant: 'error', title: '删除失败', message: '请刷新后重试。' }),
  })

  useConfirmModalController({
    open: confirmingDelete,
    title: personaQuery.data ? `确认删除“${personaQuery.data.name}”？` : '',
    description: '已关联导览任务将自动回退到系统默认人设。此操作不可撤销。',
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

  if (personaQuery.isLoading) return <section className="page-section"><div className="state-panel">正在加载人设详情</div></section>
  if (personaQuery.isError || !personaQuery.data) return <section className="page-section"><div className="state-panel state-error">无法加载该人设，请返回列表后重试。</div></section>

  const persona = personaQuery.data
  return (
    <section className="page-section persona-detail-page" aria-labelledby="persona-detail-title">
      <div className="page-heading persona-detail-heading">
        <div>
          <button className="guide-button guide-button-text editor-back" type="button" onClick={() => navigate('/voice/personas')}>
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} />
            返回人设列表
          </button>
          <div className="persona-title-line">
            <h1 id="persona-detail-title">{persona.name}</h1>
            {persona.isSystemDefault ? <span className="guide-tag guide-tag-info"><ShieldCheck aria-hidden="true" size={14} />系统默认</span> : null}
          </div>
          <p className="page-summary">音色：{persona.voice === 'female' ? '女声' : persona.voice === 'male' ? '男声' : persona.voice}</p>
        </div>
        {!persona.isSystemDefault ? (
          <div className="detail-heading-actions">
            <button className="guide-button guide-button-secondary" type="button" onClick={() => navigate(`/voice/personas/${persona.id}/edit`)}>
              <Pencil aria-hidden="true" size={16} strokeWidth={1.8} />
              编辑
            </button>
            <button className="guide-button guide-button-danger-outline" type="button" onClick={(event) => { setDeleteTrigger(event.currentTarget); setConfirmingDelete(true) }}><Trash2 aria-hidden="true" size={16} strokeWidth={1.8} />删除</button>
          </div>
        ) : null}
      </div>
      <div className="persona-detail-layout">
        <section className="persona-detail-section" aria-labelledby="persona-qa-title">
          <h2 id="persona-qa-title">问答设置</h2>
          <dl className="persona-detail-meta">
            <div><dt>提示词</dt><dd className="persona-prompt-copy">{persona.prompt || '未设置'}</dd></div>
            <div><dt>插件</dt><dd>{persona.plugins.length ? persona.plugins.map((plugin) => <span className="guide-tag guide-tag-default" key={plugin.id}>{plugin.name}</span>) : '未选择'}</dd></div>
          </dl>
        </section>
        <section className="persona-detail-section" aria-labelledby="persona-skills-title">
          <h2 id="persona-skills-title">手势动作</h2>
          <p className="persona-detail-gesture-status">{persona.presetSkillsEnabled ? '已启用' : '未启用'}</p>
        </section>
      </div>
    </section>
  )
}
