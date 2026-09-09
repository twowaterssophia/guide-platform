export const emptyClasses = {
  base: 'guide-empty',
  icon: 'guide-empty-icon',
  title: 'guide-empty-title',
  description: 'guide-empty-description',
  action: 'guide-empty-action',
} as const

export interface EmptyActionOptions {
  label: string
  onClick?: () => void
  ariaLabel?: string
  disabled?: boolean
  className?: string
}

export interface EmptyOptions {
  title: string
  description?: string | Node
  icon?: string | Node
  visual?: string | Node
  action?: string | Node | EmptyActionOptions
  onAction?: () => void
  ariaLabel?: string
  className?: string
}

function appendContent(element: HTMLElement, content: string | Node) {
  if (typeof content === 'string') element.textContent = content
  else element.append(content)
}

export function getEmptyClassName(className?: string) {
  return [emptyClasses.base, className ?? ''].filter(Boolean).join(' ')
}

export function createEmpty({
  title,
  description,
  icon,
  visual,
  action,
  onAction,
  ariaLabel,
  className,
}: EmptyOptions) {
  if (typeof document === 'undefined') {
    throw new Error('createEmpty requires a browser document')
  }

  const empty = document.createElement('section')
  empty.className = getEmptyClassName(className)
  if (ariaLabel) empty.setAttribute('aria-label', ariaLabel)

  const visualContent = visual ?? icon
  if (visualContent !== undefined) {
    const visualElement = document.createElement('div')
    visualElement.className = emptyClasses.icon
    visualElement.setAttribute('aria-hidden', 'true')
    appendContent(visualElement, visualContent)
    empty.append(visualElement)
  }

  const titleElement = document.createElement('h2')
  titleElement.className = emptyClasses.title
  titleElement.textContent = title
  empty.append(titleElement)

  if (description !== undefined) {
    const descriptionElement = document.createElement('p')
    descriptionElement.className = emptyClasses.description
    appendContent(descriptionElement, description)
    empty.append(descriptionElement)
  }

  if (action !== undefined) {
    let actionElement: Node
    if (typeof action === 'string') {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = action
      actionElement = button
    } else if (!(action instanceof Node)) {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = action.label
      button.disabled = action.disabled === true
      if (action.ariaLabel) button.setAttribute('aria-label', action.ariaLabel)
      if (action.className) button.className = action.className
      if (action.onClick) button.addEventListener('click', action.onClick)
      actionElement = button
    } else {
      actionElement = action
    }

    if (actionElement instanceof HTMLElement) {
      actionElement.classList.add(emptyClasses.action)
      if (onAction) actionElement.addEventListener('click', onAction)
    }

    empty.append(actionElement)
  }

  return empty
}

export const Empty = createEmpty
