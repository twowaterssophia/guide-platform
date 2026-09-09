import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { PersonaCustomSkillInput, PersonaWriteInput, SkillSummary } from '@guide/contracts'
import { ApiClientError } from '../../api/client'
import { createPersona, getPersona, listCompatibleSkills, personaQueryKey, updatePersona } from './personas-api'

interface PersonaDraft {
  name: string
  voice: string
  prompt: string
  presetSkillsEnabled: boolean
  customSkills: PersonaCustomSkillInput[]
}

const emptyDraft: PersonaDraft = {
  name: '',
  voice: 'female',
  prompt: '',
  presetSkillsEnabled: true,
  customSkills: [],
}

function draftFromPersona(persona: { name: string; voice: string; prompt: string; presetSkillsEnabled: boolean; customSkills: PersonaCustomSkillInput[] }): PersonaDraft {
  return {
    name: persona.name,
    voice: persona.voice,
    prompt: persona.prompt,
    presetSkillsEnabled: persona.presetSkillsEnabled,
    customSkills: persona.customSkills.map(({ skillId, instruction, example }) => ({ skillId, instruction, example })),
  }
}

function displaySkillSource(skill: SkillSummary) {
  return skill.source === 'official' ? '官方技能' : '云端技能'
}

export function PersonaFormPage() {
  const navigate = useNavigate()
  const { personaId } = useParams()
  const isEditing = Boolean(personaId)
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<PersonaDraft>(emptyDraft)
  const detailQuery = useQuery({
    queryKey: [...personaQueryKey, personaId],
    queryFn: () => getPersona(personaId ?? ''),
    enabled: isEditing,
  })
  const skillsQuery = useQuery({ queryKey: ['skills', 'compatible'], queryFn: listCompatibleSkills })

  useEffect(() => {
    if (detailQuery.data) setDraft(draftFromPersona(detailQuery.data))
  }, [detailQuery.data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const input: PersonaWriteInput = {
        name: draft.name.trim(),
        voice: draft.voice,
        prompt: draft.prompt.trim(),
        presetSkillsEnabled: draft.presetSkillsEnabled,
        customSkills: draft.customSkills.map((skill) => ({
          skillId: skill.skillId,
          instruction: skill.instruction.trim(),
          example: skill.example.trim(),
        })),
      }
      if (isEditing && detailQuery.data) {
        return updatePersona(personaId ?? '', { ...input, expectedVersion: detailQuery.data.version })
      }
      return createPersona(input)
    },
    onSuccess: async (persona) => {
      await queryClient.invalidateQueries({ queryKey: personaQueryKey })
      navigate(`/voice/personas/${persona.id}`, { replace: true })
    },
  })

  const availableSkills = skillsQuery.data ?? []
  const selectedSkillIds = new Set(draft.customSkills.map((skill) => skill.skillId))
  const canSave = Boolean(
    draft.name.trim()
    && draft.voice
    && draft.customSkills.every((skill) => skill.instruction.trim() && skill.example.trim()),
  )

  const addSkill = (skillId: string) => {
    if (selectedSkillIds.has(skillId)) return
    setDraft((current) => ({ ...current, customSkills: [...current.customSkills, { skillId, instruction: '', example: '' }] }))
  }

  const updateSkill = (skillId: string, key: 'instruction' | 'example', value: string) => {
    setDraft((current) => ({
      ...current,
      customSkills: current.customSkills.map((skill) => skill.skillId === skillId ? { ...skill, [key]: value } : skill),
    }))
  }

  if (isEditing && detailQuery.isLoading) return <section className="page-section"><div className="state-panel">正在加载人设</div></section>
  if (isEditing && (detailQuery.isError || detailQuery.data?.isSystemDefault)) {
    return <section className="page-section"><div className="state-panel state-error">该人设不可编辑，请返回列表后重试。</div></section>
  }

  return (
    <section className="page-section persona-form-page" aria-labelledby="persona-form-title">
      <div className="page-heading persona-form-heading">
        <div>
          <button className="guide-button guide-button-text editor-back" type="button" onClick={() => navigate(isEditing && personaId ? `/voice/personas/${personaId}` : '/voice/personas')}>
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} />
            {isEditing ? '返回人设详情' : '返回人设列表'}
          </button>
          <h1 id="persona-form-title">{isEditing ? '编辑人设' : '新建人设'}</h1>
          <p className="page-summary">设置机器人在导览中的表达方式，以及允许自主调用的技能。</p>
        </div>
      </div>
      <form className="persona-editor" onSubmit={(event) => {
        event.preventDefault()
        if (canSave) saveMutation.mutate()
      }}>
        <section className="persona-form-section" aria-labelledby="persona-basic-title">
          <h2 id="persona-basic-title">基础设置</h2>
          <div className="persona-form-grid">
            <label className="editor-field"><span>人设名称</span><input value={draft.name} maxLength={80} required onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="例如：展厅讲解员" /></label>
            <label className="editor-field"><span>音色</span><select value={draft.voice} onChange={(event) => setDraft((current) => ({ ...current, voice: event.target.value }))}><option value="female">女声</option><option value="male">男声</option></select></label>
          </div>
          <label className="editor-field persona-prompt-field"><span>表达规则</span><textarea value={draft.prompt} maxLength={8_000} onChange={(event) => setDraft((current) => ({ ...current, prompt: event.target.value }))} placeholder="描述导览时的角色、语气和回答边界。" /></label>
        </section>
        <section className="persona-form-section" aria-labelledby="persona-skill-settings-title">
          <div className="persona-section-heading"><div><h2 id="persona-skill-settings-title">技能设置</h2><p>为人设配置可自主调用的动作技能与模型调用规则。</p></div><Sparkles aria-hidden="true" size={20} strokeWidth={1.8} /></div>
          <label className="persona-toggle"><input type="checkbox" checked={draft.presetSkillsEnabled} onChange={(event) => setDraft((current) => ({ ...current, presetSkillsEnabled: event.target.checked }))} /><span><strong>应用预置技能</strong><small>包含基础问候和常用动作能力。</small></span></label>
          <div className="persona-custom-skills">
            <div className="persona-custom-skills-heading"><div><strong>自定义技能</strong><p>仅可选择当前兼容的官方或云端技能，并为每项技能补充调用规则与示例。</p></div></div>
            {skillsQuery.isLoading ? <p className="persona-empty-copy">正在加载可用技能。</p> : null}
            {skillsQuery.isError ? <p className="persona-form-error">无法加载技能目录，请检查本地服务。</p> : null}
            {skillsQuery.isSuccess ? <div className="persona-skill-picker" aria-label="可添加的技能">
              {availableSkills.map((skill) => <button key={skill.id} type="button" className="persona-skill-option" disabled={selectedSkillIds.has(skill.id)} onClick={() => addSkill(skill.id)}>
                <span><strong>{skill.name}</strong><small>{displaySkillSource(skill)} · v{skill.version}</small></span>
                <Plus aria-hidden="true" size={16} strokeWidth={2} />
              </button>)}
            </div> : null}
            {draft.customSkills.length > 0 ? <div className="persona-skill-edit-list">
              {draft.customSkills.map((selectedSkill) => {
                const skill = availableSkills.find((item) => item.id === selectedSkill.skillId)
                return <article className="persona-skill-edit-item" key={selectedSkill.skillId}>
                  <div className="persona-skill-edit-heading"><div><strong>{skill?.name ?? selectedSkill.skillId}</strong><span>{skill ? displaySkillSource(skill) : '技能目录已变化'}</span></div><button className="guide-button guide-button-icon persona-delete-icon" type="button" aria-label={`移除 ${skill?.name ?? selectedSkill.skillId}`} title="移除技能" onClick={() => setDraft((current) => ({ ...current, customSkills: current.customSkills.filter((item) => item.skillId !== selectedSkill.skillId) }))}><Trash2 aria-hidden="true" size={16} strokeWidth={1.8} /></button></div>
                  <div className="persona-skill-edit-grid">
                    <label className="editor-field"><span>调用规则</span><textarea required value={selectedSkill.instruction} onChange={(event) => updateSkill(selectedSkill.skillId, 'instruction', event.target.value)} placeholder="例如：在固定点位欢迎访客时调用。" /></label>
                    <label className="editor-field"><span>示例</span><textarea required value={selectedSkill.example} onChange={(event) => updateSkill(selectedSkill.skillId, 'example', event.target.value)} placeholder="例如：欢迎来到展厅，我来为您介绍。" /></label>
                  </div>
                </article>
              })}
            </div> : <p className="persona-empty-copy">尚未添加自定义技能。</p>}
          </div>
        </section>
        {saveMutation.isError ? <p className="persona-form-error" role="alert">{saveMutation.error instanceof ApiClientError && saveMutation.error.status === 409 ? '人设已被其他会话更新，请刷新后再试。' : '保存失败，请检查填写内容后重试。'}</p> : null}
        <footer className="persona-editor-actions"><button className="guide-button guide-button-secondary" type="button" onClick={() => navigate(isEditing && personaId ? `/voice/personas/${personaId}` : '/voice/personas')}>取消</button><button className={`guide-button guide-button-primary${saveMutation.isPending ? ' is-loading' : ''}`} type="submit" disabled={!canSave || saveMutation.isPending}><Save aria-hidden="true" size={16} strokeWidth={1.8} />{isEditing ? '保存修改' : '创建人设'}</button></footer>
      </form>
    </section>
  )
}
