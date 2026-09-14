import { useId, useState } from 'react'
import type { McpPluginWriteInput, PluginAuthType } from '@guide/contracts'
import { PluginAuthSelect } from './plugin-auth-select'

export type PluginDraft = McpPluginWriteInput

export const emptyPluginDraft: PluginDraft = {
  name: '', description: '', examples: '', serviceUrl: '', authType: 'NONE', credentials: {}, keepExistingCredentials: false, customHeaders: {},
}

interface PluginFormProps {
  initial: PluginDraft
  existingHasCredentials: boolean
  onSave: (draft: PluginDraft) => void
  onCancel: () => void
  pending: boolean
}

type PluginField = 'name' | 'serviceUrl' | 'description' | 'examples' | 'token' | 'headerName' | 'apiKey' | 'username' | 'password' | 'customHeaders'
type PluginFormErrors = Partial<Record<PluginField, string>>

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <small className="editor-field-error" id={id} role="alert">{message}</small> : null
}

function parseHeaders(value: string) {
  const customHeaders = JSON.parse(value || '{}') as unknown
  if (!customHeaders || Array.isArray(customHeaders) || typeof customHeaders !== 'object' || Object.values(customHeaders).some((item) => typeof item !== 'string')) {
    throw new Error('请输入有效的 JSON 对象，且每个值均为文本。')
  }
  return customHeaders as Record<string, string>
}

export function PluginForm({ initial, existingHasCredentials, onSave, onCancel, pending }: PluginFormProps) {
  const [draft, setDraft] = useState(initial)
  const [headersText, setHeadersText] = useState(JSON.stringify(initial.customHeaders, null, 2))
  const [errors, setErrors] = useState<PluginFormErrors>({})
  const errorPrefix = useId()
  const errorId = (field: PluginField) => `${errorPrefix}-${field}`
  const clearError = (field: PluginField) => setErrors((current) => current[field] ? { ...current, [field]: undefined } : current)
  const update = (change: Partial<PluginDraft>) => setDraft((current) => ({ ...current, ...change }))
  const updateCredentials = (credentials: NonNullable<PluginDraft['credentials']>) => setDraft((current) => ({ ...current, credentials, keepExistingCredentials: false }))
  const updateAuthType = (authType: PluginAuthType) => setDraft((current) => ({ ...current, authType, credentials: {}, keepExistingCredentials: false }))
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: PluginFormErrors = {}
    if (!draft.name.trim()) nextErrors.name = '请输入插件名称。'
    if (!draft.serviceUrl.trim()) nextErrors.serviceUrl = '请输入 MCP 服务地址。'
    else {
      try {
        const url = new URL(draft.serviceUrl)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') nextErrors.serviceUrl = '请输入以 http:// 或 https:// 开头的有效地址。'
      } catch {
        nextErrors.serviceUrl = '请输入有效的 MCP 服务地址。'
      }
    }
    if (!draft.description.trim()) nextErrors.description = '请输入插件描述。'
    if (!draft.examples.trim()) nextErrors.examples = '请输入识别示例。'

    const credentials = draft.credentials ?? {}
    const credentialsRequired = !existingHasCredentials || !draft.keepExistingCredentials
    if (draft.authType === 'BEARER' && credentialsRequired && !credentials.token?.trim()) nextErrors.token = '请输入 Token。'
    if (draft.authType === 'API_KEY' && credentialsRequired) {
      if (!credentials.headerName?.trim()) nextErrors.headerName = '请输入请求头名称。'
      if (!credentials.apiKey?.trim()) nextErrors.apiKey = '请输入 API Key。'
    }
    if (draft.authType === 'BASIC' && credentialsRequired) {
      if (!credentials.username?.trim()) nextErrors.username = '请输入用户名。'
      if (!credentials.password?.trim()) nextErrors.password = '请输入密码。'
    }

    let customHeaders: Record<string, string> = {}
    try {
      customHeaders = parseHeaders(headersText)
    } catch (reason) {
      nextErrors.customHeaders = reason instanceof Error ? reason.message : '请求头格式不正确。'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    onSave({ ...draft, customHeaders })
  }
  return <form className="plugin-form" onSubmit={submit} noValidate>
    <label className="editor-field"><span>插件名称</span><input aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? errorId('name') : undefined} maxLength={100} value={draft.name} onChange={(event) => { update({ name: event.target.value }); clearError('name') }} placeholder="请输入插件名称" /><FieldError id={errorId('name')} message={errors.name} /></label>
    <label className="editor-field"><span>MCP 服务地址</span><input aria-invalid={Boolean(errors.serviceUrl)} aria-describedby={errors.serviceUrl ? errorId('serviceUrl') : undefined} value={draft.serviceUrl} onChange={(event) => { update({ serviceUrl: event.target.value }); clearError('serviceUrl') }} placeholder="https://example.com/mcp" /><FieldError id={errorId('serviceUrl')} message={errors.serviceUrl} /></label>
    <label className="editor-field"><span>描述</span><textarea aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? errorId('description') : undefined} maxLength={2_000} value={draft.description} onChange={(event) => { update({ description: event.target.value }); clearError('description') }} placeholder="说明插件可以提供什么能力。" /><FieldError id={errorId('description')} message={errors.description} /></label>
    <label className="editor-field"><span>识别示例</span><textarea aria-invalid={Boolean(errors.examples)} aria-describedby={errors.examples ? errorId('examples') : undefined} maxLength={2_000} value={draft.examples} onChange={(event) => { update({ examples: event.target.value }); clearError('examples') }} placeholder="说明哪些问题适合调用此插件。" /><FieldError id={errorId('examples')} message={errors.examples} /></label>
    <div className="editor-field"><span id="plugin-auth-type-label">认证方式</span><PluginAuthSelect value={draft.authType} labelId="plugin-auth-type-label" onChange={updateAuthType} /></div>
    {draft.authType !== 'NONE' && existingHasCredentials ? <p className="plugin-credential-hint">已保存认证信息；留空将继续使用现有凭据，填写新值则会替换。</p> : null}
    {draft.authType === 'BEARER' ? <label className="editor-field"><span>Token</span><input aria-invalid={Boolean(errors.token)} aria-describedby={errors.token ? errorId('token') : undefined} type="password" value={draft.credentials?.token ?? ''} onChange={(event) => { updateCredentials({ ...draft.credentials, token: event.target.value }); clearError('token') }} /><FieldError id={errorId('token')} message={errors.token} /></label> : null}
    {draft.authType === 'API_KEY' ? <><label className="editor-field"><span>请求头名称</span><input aria-invalid={Boolean(errors.headerName)} aria-describedby={errors.headerName ? errorId('headerName') : undefined} value={draft.credentials?.headerName ?? ''} onChange={(event) => { updateCredentials({ ...draft.credentials, headerName: event.target.value }); clearError('headerName') }} /><FieldError id={errorId('headerName')} message={errors.headerName} /></label><label className="editor-field"><span>API Key</span><input aria-invalid={Boolean(errors.apiKey)} aria-describedby={errors.apiKey ? errorId('apiKey') : undefined} type="password" value={draft.credentials?.apiKey ?? ''} onChange={(event) => { updateCredentials({ ...draft.credentials, apiKey: event.target.value }); clearError('apiKey') }} /><FieldError id={errorId('apiKey')} message={errors.apiKey} /></label></> : null}
    {draft.authType === 'BASIC' ? <><label className="editor-field"><span>用户名</span><input aria-invalid={Boolean(errors.username)} aria-describedby={errors.username ? errorId('username') : undefined} value={draft.credentials?.username ?? ''} onChange={(event) => { updateCredentials({ ...draft.credentials, username: event.target.value }); clearError('username') }} /><FieldError id={errorId('username')} message={errors.username} /></label><label className="editor-field"><span>密码</span><input aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? errorId('password') : undefined} type="password" value={draft.credentials?.password ?? ''} onChange={(event) => { updateCredentials({ ...draft.credentials, password: event.target.value }); clearError('password') }} /><FieldError id={errorId('password')} message={errors.password} /></label></> : null}
    <label className="editor-field"><span>自定义请求头（JSON，可选）</span><textarea aria-invalid={Boolean(errors.customHeaders)} aria-describedby={errors.customHeaders ? errorId('customHeaders') : undefined} value={headersText} onChange={(event) => { setHeadersText(event.target.value); clearError('customHeaders') }} placeholder={'{\n  "X-Tenant": "demo"\n}'} /><FieldError id={errorId('customHeaders')} message={errors.customHeaders} /></label>
    <footer className="plugin-form-actions"><button className="guide-button guide-button-secondary" type="button" onClick={onCancel}>取消</button><button className={`guide-button guide-button-primary${pending ? ' is-loading' : ''}`} type="submit" disabled={pending}>{pending ? '保存中' : '保存'}</button></footer>
  </form>
}
