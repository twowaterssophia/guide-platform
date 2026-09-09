export const modalClasses = {
  backdrop: 'guide-modal-backdrop',
  base: 'guide-modal',
  danger: 'guide-modal-danger',
  header: 'guide-modal-header',
  title: 'guide-modal-title',
  close: 'guide-modal-close',
  content: 'guide-modal-content',
  footer: 'guide-modal-footer',
  cancel: 'guide-modal-cancel',
  confirm: 'guide-modal-confirm',
} as const

export interface ModalActionOptions {
  label: string
  onClick?: () => void
  ariaLabel?: string
  className?: string
  disabled?: boolean
}

export type ConfirmModalActionOptions = ModalActionOptions

export interface ModalOptions {
  title: string | Node
  content?: string | Node
  footer?: string | Node
  closeLabel?: string
  showClose?: boolean
  open?: boolean
  trigger?: HTMLElement
  ariaLabel?: string
  className?: string
  dismissOnBackdrop?: boolean
  dismissOnEscape?: boolean
  onClose?: () => void
  onOpenChange?: (open: boolean) => void
}

export interface ConfirmModalOptions {
  title: string | Node
  description?: string | Node
  confirmLabel?: string
  cancelLabel?: string
  confirmAction?: ModalActionOptions | Node
  cancelAction?: ModalActionOptions | Node
  closeLabel?: string
  showClose?: boolean
  open?: boolean
  trigger?: HTMLElement
  ariaLabel?: string
  className?: string
  danger?: boolean
  dismissOnBackdrop?: boolean
  dismissOnEscape?: boolean
  onConfirm?: () => void
  onCancel?: () => void
  onOpenChange?: (open: boolean) => void
}

export interface ModalElement extends HTMLDivElement {
  open: () => void
  close: () => void
  destroy: () => void
}

export interface ConfirmModalElement extends ModalElement {
  confirm: () => void
  cancel: () => void
}

let modalId = 0

function getModalId() {
  modalId += 1
  return `guide-modal-${modalId}`
}

function appendContent(element: HTMLElement, content: string | Node) {
  if (typeof content === 'string') element.textContent = content
  else element.append(content)
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true')
}

function getActionElement(
  action: ModalActionOptions | Node | undefined,
  fallbackLabel: string,
  className: string,
) {
  if (action instanceof HTMLElement) {
    action.classList.add(...className.split(/\s+/).filter(Boolean))
    return action
  }

  if (action instanceof Node) {
    const wrapper = document.createElement('span')
    wrapper.className = className
    wrapper.append(action)
    return wrapper
  }

  const button = document.createElement('button')
  button.type = 'button'
  button.className = className
  button.textContent = action?.label ?? fallbackLabel
  button.disabled = action?.disabled === true
  if (action?.ariaLabel) button.setAttribute('aria-label', action.ariaLabel)
  if (action?.className) button.classList.add(...action.className.split(/\s+/).filter(Boolean))
  if (action?.onClick) button.addEventListener('click', action.onClick)
  return button
}

interface ModalParts {
  element: ModalElement
  footer: HTMLDivElement
  setRequestClose: (handler: () => void) => void
}

function buildModal({
  title,
  content,
  footer,
  closeLabel = '关闭',
  showClose = true,
  trigger,
  ariaLabel,
  className,
  dismissOnBackdrop = true,
  dismissOnEscape = true,
  onClose,
  onOpenChange,
}: ModalOptions & { open?: boolean }): ModalParts {
  if (typeof document === 'undefined') {
    throw new Error('createModal requires a browser document')
  }

  const backdrop = document.createElement('div')
  backdrop.className = modalClasses.backdrop
  backdrop.setAttribute('role', 'presentation')
  backdrop.hidden = true

  const dialog = document.createElement('div') as ModalElement
  const id = getModalId()
  const titleId = `${id}-title`
  dialog.className = [modalClasses.base, className ?? ''].filter(Boolean).join(' ')
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('aria-labelledby', titleId)
  dialog.setAttribute('aria-hidden', 'true')
  dialog.tabIndex = -1
  if (ariaLabel) dialog.setAttribute('aria-label', ariaLabel)

  const header = document.createElement('div')
  header.className = modalClasses.header
  const titleElement = document.createElement('h2')
  titleElement.className = modalClasses.title
  titleElement.id = titleId
  appendContent(titleElement, title)
  header.append(titleElement)

  let closeButton: HTMLButtonElement | undefined
  if (showClose) {
    closeButton = document.createElement('button')
    closeButton.type = 'button'
    closeButton.className = modalClasses.close
    closeButton.setAttribute('aria-label', closeLabel)
    closeButton.textContent = '×'
    header.append(closeButton)
  }
  dialog.append(header)

  if (content !== undefined) {
    const contentElement = document.createElement('div')
    const contentId = `${id}-content`
    contentElement.className = modalClasses.content
    contentElement.id = contentId
    appendContent(contentElement, content)
    dialog.setAttribute('aria-describedby', contentId)
    dialog.append(contentElement)
  }

  const footerElement = document.createElement('div')
  footerElement.className = modalClasses.footer
  if (footer !== undefined) appendContent(footerElement, footer)
  dialog.append(footerElement)
  backdrop.append(dialog)

  let isOpen = false
  let destroyed = false
  let previouslyFocused: HTMLElement | null = null
  let requestClose = () => dialog.close()

  const focusFirst = () => {
    const focusable = getFocusableElements(dialog)
    ;(focusable[0] ?? dialog).focus()
  }

  const restoreFocus = () => {
    const focusTarget = trigger && !trigger.hasAttribute('disabled') ? trigger : previouslyFocused
    if (focusTarget && focusTarget.isConnected && !focusTarget.hasAttribute('disabled')) focusTarget.focus()
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isOpen) return

    if (event.key === 'Escape') {
      if (!dismissOnEscape) return
      event.preventDefault()
      requestClose()
      return
    }

    if (event.key !== 'Tab') return
    const focusable = getFocusableElements(dialog)
    if (focusable.length === 0) {
      event.preventDefault()
      dialog.focus()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    } else if (!dialog.contains(document.activeElement)) {
      event.preventDefault()
      first.focus()
    }
  }

  const handleBackdropClick = (event: MouseEvent) => {
    if (dismissOnBackdrop && event.target === backdrop) requestClose()
  }

  dialog.open = () => {
    if (destroyed || isOpen) return
    previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : trigger ?? null
    isOpen = true
    backdrop.hidden = false
    dialog.setAttribute('aria-hidden', 'false')
    document.addEventListener('keydown', handleKeyDown)
    focusFirst()
    onOpenChange?.(true)
  }

  dialog.close = () => {
    if (destroyed || !isOpen) return
    isOpen = false
    document.removeEventListener('keydown', handleKeyDown)
    backdrop.hidden = true
    dialog.setAttribute('aria-hidden', 'true')
    restoreFocus()
    onClose?.()
    onOpenChange?.(false)
  }

  const handleCloseClick = () => requestClose()
  closeButton?.addEventListener('click', handleCloseClick)
  backdrop.addEventListener('click', handleBackdropClick)

  dialog.destroy = () => {
    if (destroyed) return
    dialog.close()
    document.removeEventListener('keydown', handleKeyDown)
    closeButton?.removeEventListener('click', handleCloseClick)
    backdrop.removeEventListener('click', handleBackdropClick)
    destroyed = true
  }

  const result = backdrop as ModalElement
  result.open = dialog.open
  result.close = dialog.close
  result.destroy = dialog.destroy
  return {
    element: result,
    footer: footerElement,
    setRequestClose: (handler) => { requestClose = handler },
  }
}

export function getModalClassName(className?: string) {
  return [modalClasses.base, className ?? ''].filter(Boolean).join(' ')
}

export const confirmModalClasses = modalClasses
export const getConfirmModalClassName = getModalClassName

export function createModal(options: ModalOptions): ModalElement {
  const parts = buildModal(options)
  if (options.open) parts.element.open()
  return parts.element
}

export function createConfirmModal({
  title,
  description,
  confirmLabel = '确认',
  cancelLabel = '取消',
  confirmAction,
  cancelAction,
  closeLabel = '关闭',
  showClose = true,
  open: initiallyOpen = false,
  trigger,
  ariaLabel,
  className,
  danger = true,
  dismissOnBackdrop = false,
  dismissOnEscape = false,
  onConfirm,
  onCancel,
  onOpenChange,
}: ConfirmModalOptions): ConfirmModalElement {
  const parts = buildModal({
    title,
    content: description,
    closeLabel,
    showClose,
    open: false,
    trigger,
    ariaLabel,
    className: [danger ? modalClasses.danger : '', className ?? ''].filter(Boolean).join(' '),
    dismissOnBackdrop,
    dismissOnEscape,
    onOpenChange,
  })

  const actionTone = danger ? 'guide-button-danger' : 'guide-button-primary'
  const cancelButton = getActionElement(
    cancelAction,
    cancelLabel,
    `guide-button guide-button-secondary ${modalClasses.cancel}`,
  )
  const confirmButton = getActionElement(
    confirmAction,
    confirmLabel,
    `guide-button ${actionTone} ${modalClasses.confirm}`,
  )
  parts.footer.append(cancelButton, confirmButton)

  const result = parts.element as ConfirmModalElement
  result.confirm = () => {
    if (result.hidden) return
    onConfirm?.()
    result.close()
  }
  result.cancel = () => {
    if (result.hidden) return
    onCancel?.()
    result.close()
  }
  parts.setRequestClose(() => result.cancel())

  const handleCancelClick = () => result.cancel()
  const handleConfirmClick = () => result.confirm()
  cancelButton.addEventListener('click', handleCancelClick)
  confirmButton.addEventListener('click', handleConfirmClick)

  const originalDestroy = result.destroy
  result.destroy = () => {
    cancelButton.removeEventListener('click', handleCancelClick)
    confirmButton.removeEventListener('click', handleConfirmClick)
    originalDestroy()
  }

  if (initiallyOpen) result.open()
  return result
}

export const Modal = createModal
export const ConfirmModal = createConfirmModal
