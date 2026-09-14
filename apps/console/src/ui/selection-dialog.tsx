import { Check, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface SelectionDialogOption {
  id: string
  label: string
  description?: string
  group?: string
}

interface SelectionDialogProps {
  open: boolean
  title: string
  options: SelectionDialogOption[]
  value: string[]
  mode: 'single' | 'multiple'
  trigger: HTMLElement | null
  emptyMessage?: string
  confirmLabel?: string
  requireSelection?: boolean
  onConfirm: (value: string[]) => void
  onClose: () => void
}

export function SelectionDialog({
  open,
  title,
  options,
  value,
  mode,
  trigger,
  emptyMessage = '暂无可选项',
  confirmLabel = '确定',
  requireSelection = false,
  onConfirm,
  onClose,
}: SelectionDialogProps) {
  const [pendingValue, setPendingValue] = useState(value)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    setPendingValue(value)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.requestAnimationFrame(() => (dialogRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]') ?? dialogRef.current?.querySelector<HTMLButtonElement>('[role="option"]'))?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      if (trigger?.isConnected) trigger.focus()
    }
  }, [onClose, open, trigger, value])

  if (!open) return null

  const groups = options.reduce<Array<{ label: string | null; options: SelectionDialogOption[] }>>((result, option) => {
    const label = option.group ?? null
    const group = result.find((candidate) => candidate.label === label)
    if (group) group.options.push(option)
    else result.push({ label, options: [option] })
    return result
  }, [])
  const toggleOption = (optionId: string) => {
    setPendingValue((current) => mode === 'single'
      ? [optionId]
      : current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId])
  }

  return createPortal(
    <div className="guide-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialogRef} className="guide-modal selection-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="guide-modal-header">
          <h2 className="guide-modal-title" id={titleId}>{title}</h2>
          <button className="guide-modal-close" type="button" aria-label="关闭" onClick={onClose}><X aria-hidden="true" size={18} /></button>
        </div>
        <div className="guide-modal-content selection-dialog-content">
          <div className={`selection-dialog-list is-${mode}`} role="listbox" aria-label={title} aria-multiselectable={mode === 'multiple'}>
            {groups.length ? groups.map((group, groupIndex) => (
              <section className="selection-dialog-group" key={group.label ?? `group-${groupIndex}`} aria-label={group.label ?? undefined}>
                {group.label ? <h3>{group.label}</h3> : null}
                {group.options.map((option) => {
                  const selected = pendingValue.includes(option.id)
                  return <button key={option.id} className="selection-dialog-option" type="button" role="option" aria-selected={selected} onClick={() => toggleOption(option.id)}>
                    <span className={`selection-dialog-indicator is-${mode}${selected ? ' is-selected' : ''}`} aria-hidden="true">{mode === 'multiple' && selected ? <Check size={14} strokeWidth={2.4} /> : null}</span>
                    <span className="selection-dialog-option-copy"><strong>{option.label}</strong>{option.description ? <small>{option.description}</small> : null}</span>
                  </button>
                })}
              </section>
            )) : <p className="selection-dialog-empty">{emptyMessage}</p>}
          </div>
        </div>
        <div className="guide-modal-footer">
          <button className="guide-button guide-button-secondary" type="button" onClick={onClose}>取消</button>
          <button className="guide-button guide-button-primary" type="button" disabled={requireSelection && pendingValue.length === 0} onClick={() => onConfirm(pendingValue)}>{confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
