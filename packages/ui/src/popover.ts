export const popoverPlacements = ['bottom-start', 'bottom-end', 'top-start', 'top-end'] as const
export type PopoverPlacement = (typeof popoverPlacements)[number]

export const popoverClasses = {
  base: 'guide-popover',
  open: 'guide-popover-open',
  trigger: 'guide-popover-trigger',
  content: 'guide-popover-content',
} as const

export interface PopoverAttributes {
  className: string
  'data-placement': PopoverPlacement
}

export interface PopoverOptions {
  trigger: string | Node
  content: string | Node
  placement?: PopoverPlacement
  open?: boolean
  id?: string
  ariaLabel?: string
  className?: string
  triggerClassName?: string
  contentClassName?: string
  closeOnOutsideClick?: boolean
  closeOnEscape?: boolean
  onOpenChange?: (open: boolean) => void
}

export interface PopoverElement extends HTMLDivElement {
  open: () => void
  close: () => void
  toggle: () => void
  destroy: () => void
}

let popoverId = 0

function getPopoverId() {
  popoverId += 1
  return `guide-popover-${popoverId}`
}

function getPlacementParts(placement: PopoverPlacement) {
  const [side, align] = placement.split('-') as ['bottom' | 'top', 'start' | 'end']
  return { side, align }
}

export function getPopoverClassName({ placement = 'bottom-start', className }: Pick<PopoverOptions, 'placement' | 'className'> = {}) {
  return [popoverClasses.base, `guide-popover-${placement}`, className ?? ''].filter(Boolean).join(' ')
}

export function getPopoverAttributes({ placement = 'bottom-start', className }: Pick<PopoverOptions, 'placement' | 'className'> = {}): PopoverAttributes {
  return {
    className: getPopoverClassName({ placement, className }),
    'data-placement': placement,
  }
}

function appendContent(element: HTMLElement, content: string | Node) {
  if (typeof content === 'string') element.textContent = content
  else element.append(content)
}

function createTrigger(trigger: string | Node) {
  if (typeof trigger === 'string') {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = trigger
    return button
  }

  if (trigger instanceof HTMLElement) return trigger

  const button = document.createElement('button')
  button.type = 'button'
  button.append(trigger)
  return button
}

function isNaturallyInteractive(element: HTMLElement) {
  return ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)
}

export function createPopover({
  trigger,
  content,
  placement = 'bottom-start',
  open: initiallyOpen = false,
  id,
  ariaLabel,
  className,
  triggerClassName,
  contentClassName,
  closeOnOutsideClick = true,
  closeOnEscape = true,
  onOpenChange,
}: PopoverOptions): PopoverElement {
  if (typeof document === 'undefined') {
    throw new Error('createPopover requires a browser document')
  }

  const root = document.createElement('div') as PopoverElement
  const attributes = getPopoverAttributes({ placement, className })
  root.className = attributes.className
  root.dataset.placement = attributes['data-placement']

  const triggerElement = createTrigger(trigger)
  triggerElement.classList.add(popoverClasses.trigger)
  if (triggerClassName) triggerElement.classList.add(...triggerClassName.split(/\s+/).filter(Boolean))

  const contentElement = document.createElement('div')
  contentElement.className = [popoverClasses.content, contentClassName ?? ''].filter(Boolean).join(' ')
  contentElement.id = id ?? getPopoverId()
  contentElement.setAttribute('role', 'dialog')
  contentElement.setAttribute('tabindex', '-1')
  contentElement.setAttribute('aria-hidden', 'true')
  if (ariaLabel) contentElement.setAttribute('aria-label', ariaLabel)
  appendContent(contentElement, content)

  triggerElement.id = triggerElement.id || `${contentElement.id}-trigger`
  triggerElement.setAttribute('aria-controls', contentElement.id)
  triggerElement.setAttribute('aria-expanded', 'false')
  triggerElement.setAttribute('aria-haspopup', 'dialog')
  contentElement.setAttribute('aria-labelledby', triggerElement.id)

  if (!isNaturallyInteractive(triggerElement)) {
    triggerElement.setAttribute('role', 'button')
    if (!triggerElement.hasAttribute('tabindex')) triggerElement.tabIndex = 0
  }

  root.append(triggerElement, contentElement)

  let isOpen = false
  let destroyed = false

  const { side: requestedSide, align: requestedAlign } = getPlacementParts(placement)

  const setPosition = () => {
    if (!isOpen || destroyed) return

    const triggerRect = triggerElement.getBoundingClientRect()
    const contentRect = contentElement.getBoundingClientRect()
    const viewportPadding = 8
    const availableBelow = window.innerHeight - triggerRect.bottom - viewportPadding
    const availableAbove = triggerRect.top - viewportPadding
    const side = requestedSide === 'bottom' && contentRect.bottom > window.innerHeight - viewportPadding && availableAbove > availableBelow
      ? 'top'
      : requestedSide === 'top' && contentRect.top < viewportPadding && availableBelow > availableAbove
        ? 'bottom'
        : requestedSide
    const align = requestedAlign === 'start' && contentRect.right > window.innerWidth - viewportPadding
      ? 'end'
      : requestedAlign === 'end' && contentRect.left < viewportPadding
        ? 'start'
        : requestedAlign

    contentElement.dataset.side = side
    contentElement.dataset.align = align
  }

  const schedulePosition = () => {
    if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(setPosition)
    else setPosition()
  }

  const handleOutsidePointerDown = (event: Event) => {
    if (!root.contains(event.target as Node)) root.close()
  }

  const handleDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    root.close()
    triggerElement.focus()
  }

  const handleViewportChange = () => schedulePosition()

  const attachOpenListeners = () => {
    if (closeOnOutsideClick) document.addEventListener('pointerdown', handleOutsidePointerDown, true)
    if (closeOnOutsideClick) document.addEventListener('click', handleOutsidePointerDown, true)
    if (closeOnEscape) document.addEventListener('keydown', handleDocumentKeyDown)
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)
  }

  const detachOpenListeners = () => {
    if (closeOnOutsideClick) document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
    if (closeOnOutsideClick) document.removeEventListener('click', handleOutsidePointerDown, true)
    if (closeOnEscape) document.removeEventListener('keydown', handleDocumentKeyDown)
    window.removeEventListener('resize', handleViewportChange)
    window.removeEventListener('scroll', handleViewportChange, true)
  }

  root.open = () => {
    if (destroyed || isOpen) return
    isOpen = true
    root.classList.add(popoverClasses.open)
    contentElement.hidden = false
    contentElement.setAttribute('aria-hidden', 'false')
    triggerElement.setAttribute('aria-expanded', 'true')
    attachOpenListeners()
    setPosition()
    schedulePosition()
    onOpenChange?.(true)
  }

  root.close = () => {
    if (destroyed || !isOpen) return
    isOpen = false
    detachOpenListeners()
    root.classList.remove(popoverClasses.open)
    contentElement.hidden = true
    contentElement.setAttribute('aria-hidden', 'true')
    triggerElement.setAttribute('aria-expanded', 'false')
    onOpenChange?.(false)
  }

  root.toggle = () => {
    if (isOpen) root.close()
    else root.open()
  }

  const handleTriggerClick = () => root.toggle()
  triggerElement.addEventListener('click', handleTriggerClick)

  const handleTriggerKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    root.toggle()
  }

  if (!isNaturallyInteractive(triggerElement)) triggerElement.addEventListener('keydown', handleTriggerKeyDown)

  root.destroy = () => {
    if (destroyed) return
    if (isOpen) root.close()
    triggerElement.removeEventListener('click', handleTriggerClick)
    if (!isNaturallyInteractive(triggerElement)) triggerElement.removeEventListener('keydown', handleTriggerKeyDown)
    destroyed = true
  }

  contentElement.hidden = true
  if (initiallyOpen) root.open()

  return root
}

export const Popover = createPopover
