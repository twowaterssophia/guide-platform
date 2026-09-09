import { createElement, useCallback, useEffect, useRef } from 'react'
import { createConfirmModal } from '../../../packages/ui/src/modal'
import type { ConfirmModalElement } from '../../../packages/ui/src/modal'
import { createPopover } from '../../../packages/ui/src/popover'
import type { PopoverElement } from '../../../packages/ui/src/popover'
import { createToastStack } from '../../../packages/ui/src/toast'
import type { ToastElement, ToastOptions, ToastStackElement } from '../../../packages/ui/src/toast'

export interface TaskMenuAdapterProps {
  taskName: string
  onDelete: (trigger: HTMLElement) => void
}

export function TaskMenuAdapter({ taskName, onDelete }: TaskMenuAdapterProps) {
  const mountRef = useRef<HTMLSpanElement | null>(null)
  const onDeleteRef = useRef(onDelete)
  onDeleteRef.current = onDelete

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const trigger = document.createElement('button')
    trigger.type = 'button'
    trigger.className = 'guide-button guide-button-icon'
    trigger.setAttribute('aria-label', `更多操作：${taskName}`)
    trigger.title = '更多操作'
    const triggerGlyph = document.createElement('span')
    triggerGlyph.setAttribute('aria-hidden', 'true')
    triggerGlyph.textContent = '⋯'
    trigger.append(triggerGlyph)

    const content = document.createElement('div')
    content.setAttribute('role', 'menu')
    const deleteButton = document.createElement('button')
    deleteButton.type = 'button'
    deleteButton.className = 'task-menu-item task-menu-item-danger'
    deleteButton.setAttribute('role', 'menuitem')
    deleteButton.textContent = '删除'
    content.append(deleteButton)

    const popover: PopoverElement = createPopover({
      trigger,
      content,
      placement: 'bottom-end',
      ariaLabel: `更多操作：${taskName}`,
      closeOnOutsideClick: true,
      closeOnEscape: true,
    })
    mount.append(popover)

    const handleDelete = () => {
      popover.close()
      onDeleteRef.current(trigger)
    }
    deleteButton.addEventListener('click', handleDelete)

    return () => {
      deleteButton.removeEventListener('click', handleDelete)
      popover.destroy()
      popover.remove()
    }
  }, [taskName])

  return createElement('span', { ref: mountRef })
}

export interface ConfirmModalControllerOptions {
  open: boolean
  title: string
  description?: string
  trigger?: HTMLElement | null
  onConfirm: () => void
  onCancel: () => void
}

export function useConfirmModalController({
  open,
  title,
  description,
  trigger,
  onConfirm,
  onCancel,
}: ConfirmModalControllerOptions) {
  const callbacksRef = useRef({ onConfirm, onCancel })
  callbacksRef.current = { onConfirm, onCancel }

  useEffect(() => {
    if (!open) return

    const modal: ConfirmModalElement = createConfirmModal({
      title,
      description,
      trigger: trigger ?? undefined,
      open: false,
      showClose: true,
      danger: true,
      dismissOnBackdrop: true,
      dismissOnEscape: true,
      onConfirm: () => callbacksRef.current.onConfirm(),
      onCancel: () => callbacksRef.current.onCancel(),
    })
    document.body.append(modal)
    modal.open()

    return () => {
      modal.destroy()
      modal.remove()
    }
  }, [open, title, description, trigger])
}

export function useToastStackController() {
  const stackRef = useRef<ToastStackElement | null>(null)
  const pendingRef = useRef<ToastOptions[]>([])

  useEffect(() => {
    const stack = createToastStack({
      position: 'top-right',
      maxVisible: 4,
      ariaLabel: '操作提示',
    })
    document.body.append(stack)
    stackRef.current = stack
    for (const options of pendingRef.current.splice(0)) stack.add(options)

    return () => {
      stack.destroy()
      stackRef.current = null
    }
  }, [])

  return useCallback((options: ToastOptions): ToastElement | null => {
    if (stackRef.current) return stackRef.current.add(options)
    pendingRef.current.push(options)
    return null
  }, [])
}
