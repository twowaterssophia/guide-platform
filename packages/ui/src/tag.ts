export const tagVariants = ['default', 'success', 'warning', 'danger', 'info'] as const
export type TagVariant = (typeof tagVariants)[number]

export const tagClasses = {
  base: 'guide-tag',
  default: 'guide-tag-default',
  success: 'guide-tag-success',
  warning: 'guide-tag-warning',
  danger: 'guide-tag-danger',
  info: 'guide-tag-info',
} as const

export interface TagOptions {
  variant?: TagVariant
  className?: string
  title?: string
  ariaLabel?: string
}

export interface TagAttributes {
  className: string
  title?: string
  'aria-label'?: string
  'data-variant': TagVariant
}

const defaultVariant: TagVariant = 'default'

export function getTagClassName({ variant = defaultVariant, className }: TagOptions = {}) {
  return [tagClasses.base, tagClasses[variant], className ?? ''].filter(Boolean).join(' ')
}

export function getTagAttributes(content: string | Node = '', { variant = defaultVariant, className, title, ariaLabel }: TagOptions = {}): TagAttributes {
  const contentTitle = typeof content === 'string' ? content : undefined

  return {
    className: getTagClassName({ variant, className }),
    'data-variant': variant,
    ...(title || contentTitle ? { title: title ?? contentTitle } : {}),
    ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
  }
}

export function createTag(content: string | Node = '', options: TagOptions = {}) {
  if (typeof document === 'undefined') {
    throw new Error('createTag requires a browser document')
  }

  const tag = document.createElement('span')
  const attributes = getTagAttributes(content, options)

  tag.className = attributes.className
  tag.dataset.variant = attributes['data-variant']
  if (attributes.title) tag.title = attributes.title
  if (attributes['aria-label']) tag.setAttribute('aria-label', attributes['aria-label'])
  if (typeof content === 'string') tag.textContent = content
  else tag.append(content)

  return tag
}

export const Tag = createTag
