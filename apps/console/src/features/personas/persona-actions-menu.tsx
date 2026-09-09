import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useCallback, useId, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useDismissablePopover } from './persona-popover'

interface PersonaActionsMenuProps {
  personaName: string
  onEdit?: () => void
  onDelete: (trigger: HTMLElement) => void
}

export function PersonaActionsMenu({ personaName, onEdit, onDelete }: PersonaActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const menuId = useId()
  const close = useCallback(() => setOpen(false), [])

  useDismissablePopover({ open, rootRef, triggerRef, onClose: close })

  const moveFocus = (event: ReactKeyboardEvent<HTMLButtonElement>, direction: 1 | -1) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])
    const currentIndex = items.indexOf(event.currentTarget)
    if (currentIndex === -1) return
    event.preventDefault()
    items[(currentIndex + direction + items.length) % items.length]?.focus()
  }

  const handleMenuItemKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    moveFocus(event, event.key === 'ArrowUp' ? -1 : 1)
  }

  const openAndFocusMenu = () => {
    setOpen(true)
    window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus())
  }

  return (
    <div className="persona-actions-menu" ref={rootRef} onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef}
        className="guide-button guide-button-icon"
        type="button"
        aria-label={`更多操作：${personaName}`}
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        title="更多操作"
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            openAndFocusMenu()
          }
        }}
      >
        <MoreHorizontal aria-hidden="true" size={18} strokeWidth={1.8} />
      </button>
      {open ? (
        <div className="persona-actions-menu-content" id={menuId} ref={menuRef} role="menu" aria-label={`${personaName} 的更多操作`}>
          {onEdit ? (
            <button type="button" role="menuitem" onClick={() => { close(); onEdit() }} onKeyDown={handleMenuItemKeyDown}>
              <Pencil aria-hidden="true" size={16} strokeWidth={1.8} />
              编辑
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
            onKeyDown={handleMenuItemKeyDown}
          >
            <Trash2 aria-hidden="true" size={16} strokeWidth={1.8} />
            删除
          </button>
        </div>
      ) : null}
    </div>
  )
}
