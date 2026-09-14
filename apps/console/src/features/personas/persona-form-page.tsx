import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useBeforeUnload, useBlocker, useNavigate, useParams } from 'react-router-dom'
import type { PersonaWriteInput } from '@guide/contracts'
import { ApiClientError } from '../../api/client'
import { useConfirmModalController } from '../../ui-adapters'
import { PluginMultiSelect, VoiceSelect } from './persona-form-controls'
import { createPersona, getPersona, listPlugins, personaQueryKey, updatePersona } from './personas-api'

interface PersonaDraft {
  name: string
  voice: string
  prompt: string
  pluginIds: string[]
  presetSkillsEnabled: boolean
}

const emptyDraft: PersonaDraft = {
  name: '',
  voice: 'female',
  prompt: '',
  pluginIds: [],
  presetSkillsEnabled: true,
}

function draftFromPersona(persona: PersonaDraft): PersonaDraft {
  return { ...persona, pluginIds: [...persona.pluginIds] }
}

function draftsMatch(left: PersonaDraft, right: PersonaDraft) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function resizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return
  textarea.style.height = 'auto'
  textarea.style.height = `${textarea.scrollHeight}px`
}

export function PersonaFormPage() {
  const navigate = useNavigate()
  const { personaId } = useParams()
  const isEditing = Boolean(personaId)
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<PersonaDraft>(emptyDraft)
  const [initialDraft, setInitialDraft] = useState<PersonaDraft>(emptyDraft)
  const [errors, setErrors] = useState<{ name?: string }>({})
  const promptRef = useRef<HTMLTextAreaElement | null>(null)
  const skipBlockRef = useRef(false)
  const errorPrefix = useId()
  const detailQuery = useQuery({
    queryKey: [...personaQueryKey, personaId],
    queryFn: () => getPersona(personaId ?? ''),
    enabled: isEditing,
  })
  const pluginsQuery = useQuery({ queryKey: ['mcp-plugins'], queryFn: listPlugins })

  useEffect(() => {
    if (!detailQuery.data) return
    const nextDraft = draftFromPersona(detailQuery.data)
    setDraft(nextDraft)
    setInitialDraft(nextDraft)
  }, [detailQuery.data])

  useEffect(() => resizeTextarea(promptRef.current), [draft.prompt])

  const isDirty = !draftsMatch(draft, initialDraft)
  const blocker = useBlocker(useCallback(() => isDirty && !skipBlockRef.current, [isDirty]))
  useBeforeUnload(useCallback((event) => {
    if (!isDirty) return
    event.preventDefault()
    event.returnValue = ''
  }, [isDirty]))

  useConfirmModalController({
    open: blocker.state === 'blocked',
    title: '放弃未保存的修改？',
    description: '离开后，本次填写的内容不会被保存。',
    confirmLabel: '放弃修改',
    cancelLabel: '继续编辑',
    onConfirm: () => blocker.proceed?.(),
    onCancel: () => blocker.reset?.(),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const input: PersonaWriteInput = {
        name: draft.name.trim(),
        voice: draft.voice,
        prompt: draft.prompt.trim(),
        pluginIds: draft.pluginIds,
        presetSkillsEnabled: draft.presetSkillsEnabled,
      }
      if (isEditing && detailQuery.data) {
        return updatePersona(personaId ?? '', { ...input, expectedVersion: detailQuery.data.version })
      }
      return createPersona(input)
    },
    onSuccess: async (persona) => {
      await queryClient.invalidateQueries({ queryKey: personaQueryKey })
      skipBlockRef.current = true
      navigate(`/voice/personas/${persona.id}`, { replace: true })
    },
  })

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
          <p className="page-summary">为机器人设置名称、音色以及回答问题时可使用的插件。</p>
        </div>
      </div>
      <form className="persona-editor" noValidate onSubmit={(event) => {
        event.preventDefault()
        const nextErrors = draft.name.trim() ? {} : { name: '请输入人设名称。' }
        setErrors(nextErrors)
        if (!Object.keys(nextErrors).length) saveMutation.mutate()
      }}>
        <section className="persona-form-section" aria-labelledby="persona-basic-title">
          <h2 id="persona-basic-title">基础设置</h2>
          <div className="persona-form-grid">
            <label className="editor-field"><span>名称</span><input aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? `${errorPrefix}-name` : undefined} value={draft.name} maxLength={100} onChange={(event) => { setDraft((current) => ({ ...current, name: event.target.value })); setErrors({}) }} placeholder="请输入人设名称" />{errors.name ? <small className="editor-field-error" id={`${errorPrefix}-name`} role="alert">{errors.name}</small> : null}</label>
            <div className="editor-field"><span id="persona-voice-label">音色</span><VoiceSelect value={draft.voice} labelId="persona-voice-label" onChange={(voice) => setDraft((current) => ({ ...current, voice }))} /></div>
          </div>
        </section>
        <section className="persona-form-section" aria-labelledby="persona-qa-title">
          <div className="persona-section-heading"><div><h2 id="persona-qa-title">问答设置</h2><p>设置机器人回答问题时的说话方式和可调用插件。</p></div></div>
          <label className="editor-field persona-prompt-field"><span>提示词（可选）</span><textarea ref={promptRef} rows={1} value={draft.prompt} maxLength={1_000} onChange={(event) => { setDraft((current) => ({ ...current, prompt: event.target.value })); resizeTextarea(event.currentTarget) }} placeholder="请输入机器人回答问题时需要遵循的规则" /></label>
          <div className="editor-field persona-plugin-field"><span id="persona-plugin-label">插件（可多选）</span><PluginMultiSelect labelId="persona-plugin-label" plugins={pluginsQuery.data?.items ?? []} value={draft.pluginIds} onChange={(pluginIds) => setDraft((current) => ({ ...current, pluginIds }))} /></div>
        </section>
        <section className="persona-form-section" aria-labelledby="persona-skill-settings-title">
          <div className="persona-section-heading"><div><h2 id="persona-skill-settings-title">手势动作</h2><p>启用后，机器人可以在说话时配合手势动作。</p></div></div>
          <label className="persona-toggle"><input aria-label="启用手势动作" type="checkbox" checked={draft.presetSkillsEnabled} onChange={(event) => setDraft((current) => ({ ...current, presetSkillsEnabled: event.target.checked }))} /><span className="persona-toggle-control" aria-hidden="true" /><span><strong>{draft.presetSkillsEnabled ? '已启用' : '未启用'}</strong></span></label>
        </section>
        {saveMutation.isError ? <p className="persona-form-error" role="alert">{saveMutation.error instanceof ApiClientError && saveMutation.error.status === 409 ? '人设已被其他会话更新，请刷新后再试。' : '保存失败，请检查填写内容后重试。'}</p> : null}
        <footer className="persona-editor-actions"><button className="guide-button guide-button-secondary" type="button" onClick={() => navigate(isEditing && personaId ? `/voice/personas/${personaId}` : '/voice/personas')}>取消</button><button className={`guide-button guide-button-primary${saveMutation.isPending ? ' is-loading' : ''}`} type="submit" disabled={saveMutation.isPending}>保存</button></footer>
      </form>
    </section>
  )
}
