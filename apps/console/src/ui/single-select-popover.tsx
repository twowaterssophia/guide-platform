import { Check, ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { focusAdjacentOption, useDismissablePopover } from './dismissable-popover'

export interface SingleSelectOption {
  value: string
  label: string
  description?: string
}

interface SingleSelectPopoverProps {
  options: SingleSelectOption[]
  value: string | null
  onChange: (value: string) => void
  placeholder: string
  labelId?: string
  ariaLabel?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
  placeholderClassName?: string
}

export function SingleSelectPopover({
  options,
  value,
  onChange,
  placeholder,
  labelId,
  ariaLabel,
  emptyMessage = '暂无可选项',
  disabled = false,
  className = '',
  triggerClassName = '',
  placeholderClassName = '',
}: SingleSelectPopoverProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const listId = useId()
  const valueId = useId()
  const selectedOption = options.find((option) => option.value === value)
  const close = useCallback(() => setOpen(false), [])

  useDismissablePopover({ open, rootRef, triggerRef, onClose: close })

  useEffect(() => {
    if (!open) return
    window.requestAnimationFrame(() => (listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]') ?? listRef.current?.querySelector<HTMLButtonElement>('[role="option"]'))?.focus())
  }, [open])

  const select = (nextValue: string) => {
    onChange(nextValue)
    close()
    triggerRef.current?.focus()
  }
  const handleOptionKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    focusAdjacentOption(listRef.current, event.currentTarget, event.key === 'ArrowDown' ? 1 : -1)
  }
  const displayLabel = selectedOption?.label ?? placeholder
  const labelledBy = labelId ? `${labelId} ${valueId}` : valueId

  return (
    <div className={`single-select-popover ${className}`.trim()} ref={rootRef}>
      <button
        ref={triggerRef}
        className={`single-select-trigger ${triggerClassName}${selectedOption ? '' : ` ${placeholderClassName}`}`.trim()}
        type="button"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : labelledBy}
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown') return
          event.preventDefault()
          setOpen(true)
        }}
      >
        <span id={valueId}>{displayLabel}</span>
        <ChevronDown aria-hidden="true" size={16} strokeWidth={1.8} />
      </button>
      {open ? (
        <div className="single-select-options" id={listId} ref={listRef} role="listbox" aria-labelledby={labelId}>
          {options.length ? options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => select(option.value)}
              onKeyDown={handleOptionKeyDown}
            >
              <span className="single-select-option-copy"><strong>{option.label}</strong>{option.description ? <small>{option.description}</small> : null}</span>
              {option.value === value ? <Check aria-hidden="true" size={16} strokeWidth={2} /> : null}
            </button>
          )) : <p>{emptyMessage}</p>}
        </div>
      ) : null}
    </div>
  )
}
