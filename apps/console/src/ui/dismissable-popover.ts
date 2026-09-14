import { useEffect } from 'react'
import type { RefObject } from 'react'

interface DismissablePopoverOptions<T extends HTMLElement, U extends HTMLElement> {
  open: boolean
  rootRef: RefObject<T | null>
  triggerRef: RefObject<U | null>
  onClose: () => void
}

export function useDismissablePopover<T extends HTMLElement, U extends HTMLElement>({
  open,
  rootRef,
  triggerRef,
  onClose,
}: DismissablePopoverOptions<T, U>) {
  useEffect(() => {
    if (!open) return

    const close = () => {
      onClose()
      triggerRef.current?.focus()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      close()
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose, open, rootRef, triggerRef])
}

export function focusAdjacentOption(container: HTMLElement | null, currentTarget: HTMLElement, direction: 1 | -1) {
  if (!container) return
  const options = Array.from(container.querySelectorAll<HTMLElement>('[role="option"]'))
  const currentIndex = options.indexOf(currentTarget)
  if (currentIndex === -1) return
  const nextIndex = (currentIndex + direction + options.length) % options.length
  options[nextIndex]?.focus()
}
