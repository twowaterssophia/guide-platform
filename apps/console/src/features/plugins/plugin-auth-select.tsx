import { Check, ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { PluginAuthType } from '@guide/contracts'

const authOptions: Array<{ value: PluginAuthType; label: string }> = [
  { value: 'NONE', label: '不需要认证' },
  { value: 'BEARER', label: 'Bearer Token' },
  { value: 'API_KEY', label: 'API Key' },
  { value: 'BASIC', label: 'Basic Auth' },
]

interface PluginAuthSelectProps {
  value: PluginAuthType
  labelId: string
  onChange: (value: PluginAuthType) => void
}

export function PluginAuthSelect({ value, labelId, onChange }: PluginAuthSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const listId = useId()
  const valueId = useId()
  const selectedOption = authOptions.find((option) => option.value === value) ?? authOptions[0]
  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    window.requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus())
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [close, open])

  const select = (nextValue: PluginAuthType) => {
    onChange(nextValue)
    close()
  }
  const handleOptionKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const options = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])
    const index = options.indexOf(event.currentTarget)
    if (index === -1 || options.length === 0) return
    options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus()
  }

  return (
    <div className="plugin-select" ref={rootRef}>
      <button ref={triggerRef} className="plugin-select-trigger" type="button" aria-labelledby={`${labelId} ${valueId}`} aria-controls={listId} aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen((current) => !current)} onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true) } }}>
        <span id={valueId}>{selectedOption.label}</span><ChevronDown aria-hidden="true" size={16} strokeWidth={1.8} />
      </button>
      {open ? <div className="plugin-select-options" id={listId} ref={listRef} role="listbox" aria-labelledby={labelId}>{authOptions.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => select(option.value)} onKeyDown={handleOptionKeyDown}><span>{option.label}</span>{option.value === value ? <Check aria-hidden="true" size={16} strokeWidth={2} /> : null}</button>)}</div> : null}
    </div>
  )
}
