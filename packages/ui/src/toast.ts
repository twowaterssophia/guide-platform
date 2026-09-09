export const toastVariants = ['info', 'success', 'warning', 'error'] as const
export type ToastVariant = (typeof toastVariants)[number]

export const toastPositions = [
  'top-right',
  'top-center',
  'top-left',
  'bottom-right',
  'bottom-center',
  'bottom-left',
] as const
export type ToastPosition = (typeof toastPositions)[number]

export const toastClasses = {
  viewport: 'guide-toast-viewport',
  stack: 'guide-toast-stack',
  base: 'guide-toast',
  content: 'guide-toast-content',
  title: 'guide-toast-title',
  message: 'guide-toast-message',
  close: 'guide-toast-close',
} as const

export interface ToastAttributes {
  className: string
  'data-variant': ToastVariant
  role: 'status' | 'alert'
  'aria-live': 'polite' | 'assertive'
  'aria-atomic': 'true'
}

export interface ToastOptions {
  message: string | Node
  variant?: ToastVariant
  title?: string
  duration?: number
  dismissible?: boolean
  pauseOnHover?: boolean
  pauseOnFocus?: boolean
  closeLabel?: string
  ariaLabel?: string
  className?: string
  onClose?: () => void
}

export interface ToastElement extends HTMLDivElement {
  close: () => void
  pause: () => void
  resume: () => void
  destroy: () => void
}

export interface ToastStackOptions {
  position?: ToastPosition
  ariaLabel?: string
  maxVisible?: number
  className?: string
}

export interface ToastStackElement extends HTMLDivElement {
  add: (toast: ToastElement | ToastOptions) => ToastElement
  removeToast: (toast: ToastElement) => void
  clear: () => void
  destroy: () => void
}

const defaultDuration = 4_000

export function getToastClassName({ variant = 'info', className }: Pick<ToastOptions, 'variant' | 'className'> = {}) {
  return [toastClasses.base, `guide-toast-${variant}`, className ?? ''].filter(Boolean).join(' ')
}

export function getToastAttributes({ variant = 'info', className }: Pick<ToastOptions, 'variant' | 'className'> = {}): ToastAttributes {
  return {
    className: getToastClassName({ variant, className }),
    'data-variant': variant,
    role: variant === 'error' ? 'alert' : 'status',
    'aria-live': variant === 'error' ? 'assertive' : 'polite',
    'aria-atomic': 'true',
  }
}

function appendContent(element: HTMLElement, content: string | Node) {
  if (typeof content === 'string') element.textContent = content
  else element.append(content)
}

export function createToast({
  message,
  variant = 'info',
  title,
  duration = defaultDuration,
  dismissible = true,
  pauseOnHover = true,
  pauseOnFocus = true,
  closeLabel = '关闭通知',
  ariaLabel,
  className,
  onClose,
}: ToastOptions): ToastElement {
  if (typeof document === 'undefined') {
    throw new Error('createToast requires a browser document')
  }

  const toast = document.createElement('div') as ToastElement
  const attributes = getToastAttributes({ variant, className })
  toast.className = attributes.className
  toast.dataset.variant = attributes['data-variant']
  toast.setAttribute('role', attributes.role)
  toast.setAttribute('aria-live', attributes['aria-live'])
  toast.setAttribute('aria-atomic', attributes['aria-atomic'])
  if (ariaLabel) toast.setAttribute('aria-label', ariaLabel)

  const content = document.createElement('div')
  content.className = toastClasses.content
  if (title) {
    const titleElement = document.createElement('strong')
    titleElement.className = toastClasses.title
    titleElement.textContent = title
    content.append(titleElement)
  }

  const messageElement = document.createElement('div')
  messageElement.className = toastClasses.message
  appendContent(messageElement, message)
  content.append(messageElement)
  toast.append(content)

  let closeButton: HTMLButtonElement | undefined
  if (dismissible) {
    closeButton = document.createElement('button')
    closeButton.type = 'button'
    closeButton.className = toastClasses.close
    closeButton.setAttribute('aria-label', closeLabel)
    closeButton.textContent = '×'
    toast.append(closeButton)
  }

  let closed = false
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let remaining = Math.max(0, duration)
  let startedAt = 0
  const pauseReasons = new Set<string>()

  const clearTimer = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
      timeoutId = undefined
    }
    startedAt = 0
  }

  const updatePausedState = () => {
    const paused = pauseReasons.size > 0
    toast.classList.toggle('is-paused', paused)
    toast.dataset.paused = paused ? 'true' : 'false'
    if (paused) {
      if (startedAt > 0) remaining = Math.max(0, remaining - (Date.now() - startedAt))
      clearTimer()
    } else if (!closed && remaining > 0 && timeoutId === undefined) {
      startedAt = Date.now()
      timeoutId = setTimeout(() => toast.close(), remaining)
    }
  }

  const setPauseReason = (reason: string, active: boolean) => {
    if (active) pauseReasons.add(reason)
    else pauseReasons.delete(reason)
    updatePausedState()
  }

  const handlePointerEnter = () => setPauseReason('hover', true)
  const handlePointerLeave = () => setPauseReason('hover', false)
  const handleFocusIn = () => setPauseReason('focus', true)
  const handleFocusOut = (event: FocusEvent) => {
    if (!toast.contains(event.relatedTarget as Node | null)) setPauseReason('focus', false)
  }
  const handleCloseClick = () => toast.close()

  const cleanup = () => {
    clearTimer()
    if (pauseOnHover) {
      toast.removeEventListener('pointerenter', handlePointerEnter)
      toast.removeEventListener('pointerleave', handlePointerLeave)
    }
    if (pauseOnFocus) {
      toast.removeEventListener('focusin', handleFocusIn)
      toast.removeEventListener('focusout', handleFocusOut)
    }
    closeButton?.removeEventListener('click', handleCloseClick)
  }

  toast.close = () => {
    if (closed) return
    closed = true
    cleanup()
    toast.remove()
    onClose?.()
  }

  toast.pause = () => {
    if (!closed) setPauseReason('manual', true)
  }

  toast.resume = () => {
    if (!closed) setPauseReason('manual', false)
  }

  toast.destroy = () => {
    if (closed) return
    closed = true
    cleanup()
    toast.remove()
  }

  if (closeButton) closeButton.addEventListener('click', handleCloseClick)
  if (pauseOnHover) {
    toast.addEventListener('pointerenter', handlePointerEnter)
    toast.addEventListener('pointerleave', handlePointerLeave)
  }
  if (pauseOnFocus) {
    toast.addEventListener('focusin', handleFocusIn)
    toast.addEventListener('focusout', handleFocusOut)
  }

  if (remaining > 0) {
    startedAt = Date.now()
    timeoutId = setTimeout(() => toast.close(), remaining)
  }

  return toast
}

export function createToastStack({
  position = 'top-right',
  ariaLabel = '通知',
  maxVisible = 5,
  className,
}: ToastStackOptions = {}): ToastStackElement {
  if (typeof document === 'undefined') {
    throw new Error('createToastStack requires a browser document')
  }

  const viewport = document.createElement('div')
  viewport.className = [toastClasses.viewport, `guide-toast-viewport-${position}`].join(' ')
  viewport.dataset.position = position
  viewport.setAttribute('role', 'region')
  viewport.setAttribute('aria-label', ariaLabel)

  const stack = document.createElement('div')
  stack.className = [toastClasses.stack, className ?? ''].filter(Boolean).join(' ')
  stack.dataset.position = position
  viewport.append(stack)

  const toasts: ToastElement[] = []
  let destroyed = false

  const removeTrackedToast = (toast: ToastElement) => {
    const index = toasts.indexOf(toast)
    if (index >= 0) toasts.splice(index, 1)
  }

  const result = viewport as ToastStackElement

  result.add = (toastOrOptions) => {
    if (destroyed) throw new Error('Cannot add a toast to a destroyed stack')

    for (let index = toasts.length - 1; index >= 0; index -= 1) {
      if (toasts[index].parentElement !== stack) toasts.splice(index, 1)
    }

    let toast: ToastElement
    if (toastOrOptions instanceof HTMLElement) {
      toast = toastOrOptions
    } else {
      const userOnClose = toastOrOptions.onClose
      toast = createToast({
        ...toastOrOptions,
        onClose: () => {
          removeTrackedToast(toast)
          userOnClose?.()
        },
      })
    }

    if (toast.parentElement !== stack) stack.append(toast)
    removeTrackedToast(toast)
    toasts.push(toast)

    if (maxVisible > 0) {
      while (toasts.length > maxVisible) {
        const oldest = toasts.shift()
        oldest?.close()
      }
    }

    return toast
  }

  result.removeToast = (toast) => {
    removeTrackedToast(toast)
    toast.destroy()
  }

  result.clear = () => {
    for (const toast of [...toasts]) toast.destroy()
    toasts.length = 0
  }

  result.destroy = () => {
    if (destroyed) return
    result.clear()
    destroyed = true
    Element.prototype.remove.call(viewport)
  }

  return result
}

export const Toast = createToast
export const ToastStack = createToastStack
