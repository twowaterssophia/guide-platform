import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useCallback, useId, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useDismissablePopover } from '../personas/persona-popover'

interface MapActionsMenuProps {
  mapName: string
  onEdit?: () => void
  onDelete: (trigger: HTMLElement) => void
}

export function MapActionsMenu({ mapName, onEdit, onDelete }: MapActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()
  const close = useCallback(() => setOpen(false), [])

  useDismissablePopover({ open, rootRef, triggerRef, onClose: close })

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])
    const currentIndex = items.indexOf(event.currentTarget)
    if (currentIndex === -1) return
    event.preventDefault()
    const direction = event.key === 'ArrowDown' ? 1 : -1
    items[(currentIndex + direction + items.length) % items.length]?.focus()
  }

  return (
    <div className="persona-actions-menu" ref={rootRef} onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef}
        className="guide-button guide-button-icon"
        type="button"
        aria-label={`更多操作：${mapName}`}
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        title="更多操作"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
            window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus())
          }
        }}
      >
        <MoreHorizontal aria-hidden="true" size={18} strokeWidth={1.8} />
      </button>
      {open ? (
        <div className="persona-actions-menu-content" id={menuId} ref={menuRef} role="menu" aria-label={`${mapName} 的更多操作`}>
          {onEdit ? (
            <button type="button" role="menuitem" onClick={() => { close(); onEdit() }} onKeyDown={onMenuKeyDown}>
              <Pencil aria-hidden="true" size={16} strokeWidth={1.8} />编辑
            </button>
          ) : null}
          <button
            className="persona-actions-menu-danger"
            type="button"
            role="menuitem"
            onClick={() => {
              close()
              if (triggerRef.current) onDelete(triggerRef.current)
            }}
            onKeyDown={onMenuKeyDown}
          >
            <Trash2 aria-hidden="true" size={16} strokeWidth={1.8} />删除
          </button>
        </div>
      ) : null}
    </div>
  )
}
