import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
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
          <div className="persona-detail-actions">
            <button className="guide-button guide-button-secondary" type="button" onClick={() => navigate(`/voice/personas/${persona.id}/edit`)}>
              <Pencil aria-hidden="true" size={16} strokeWidth={1.8} />
              编辑
            </button>
            <button className="guide-button guide-button-danger" type="button" onClick={(event) => {
              setDeleteTrigger(event.currentTarget)
              setConfirmingDelete(true)
            }}>
              <Trash2 aria-hidden="true" size={16} strokeWidth={1.8} />
              删除人设
            </button>
          </div>
        ) : null}
      </div>
      <div className="persona-detail-layout">
        <section className="persona-detail-section" aria-labelledby="persona-prompt-title">
          <h2 id="persona-prompt-title">表达规则</h2>
          <p className="persona-prompt-copy">{persona.prompt || '未设置额外表达规则。'}</p>
        </section>
        <section className="persona-detail-section" aria-labelledby="persona-skills-title">
          <div className="persona-section-heading"><div><h2 id="persona-skills-title">技能设置</h2><p>应用预置技能：{persona.presetSkillsEnabled ? '已启用' : '未启用'}</p></div><Sparkles aria-hidden="true" size={20} strokeWidth={1.8} /></div>
          {persona.customSkills.length === 0 ? <p className="persona-empty-copy">未添加自定义技能。</p> : (
            <div className="persona-skill-detail-list">
              {persona.customSkills.map((skill) => (
                <article className="persona-skill-detail-item" key={skill.id}>
                  <div><strong>{skill.skillName}</strong><span className="guide-tag guide-tag-default">{skill.source === 'official' ? '官方技能' : '云端技能'}</span></div>
                  <dl><div><dt>调用规则</dt><dd>{skill.instruction}</dd></div><div><dt>示例</dt><dd>{skill.example}</dd></div></dl>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
