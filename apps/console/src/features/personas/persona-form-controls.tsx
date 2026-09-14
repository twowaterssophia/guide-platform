import { useRef, useState } from 'react'
import { SelectionButton } from '../../ui/selection-button'
import { SelectionDialog } from '../../ui/selection-dialog'
import { SingleSelectPopover } from '../../ui/single-select-popover'

const voiceOptions = [
  { value: 'female', label: '女声' },
  { value: 'male', label: '男声' },
]

interface VoiceSelectProps {
  value: string
  labelId: string
  onChange: (value: string) => void
}

interface PluginMultiSelectProps {
  labelId: string
  plugins: Array<{ id: string; name: string; description: string }>
  value: string[]
  onChange: (value: string[]) => void
}

export function VoiceSelect({ value, labelId, onChange }: VoiceSelectProps) {
  return <SingleSelectPopover options={voiceOptions} value={value} onChange={onChange} placeholder="请选择音色" labelId={labelId} className="persona-select" triggerClassName="persona-select-trigger" />
}

export function PluginMultiSelect({ labelId, plugins, value, onChange }: PluginMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const selectedPlugins = plugins.filter((plugin) => value.includes(plugin.id))

  return <div className="persona-plugin-select">
    {selectedPlugins.length ? <div className="persona-plugin-selection" aria-live="polite">{selectedPlugins.map((plugin) => <span className="persona-plugin-selection-item" key={plugin.id}>{plugin.name}</span>)}</div> : null}
    <SelectionButton ref={triggerRef} className="persona-plugin-trigger" aria-labelledby={labelId} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>{selectedPlugins.length ? '管理插件' : '选择插件'}</SelectionButton>
    <SelectionDialog open={open} title="选择插件" mode="multiple" options={plugins.map((plugin) => ({ id: plugin.id, label: plugin.name, description: plugin.description || '暂无描述' }))} value={value} trigger={triggerRef.current} emptyMessage="暂无可用插件" onConfirm={(pluginIds) => { onChange(pluginIds); setOpen(false) }} onClose={() => setOpen(false)} />
  </div>
}
