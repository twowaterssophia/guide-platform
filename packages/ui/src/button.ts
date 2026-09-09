export const buttonVariants = ['primary', 'secondary', 'text', 'icon', 'danger'] as const
export type ButtonVariant = (typeof buttonVariants)[number]

export interface ButtonAttributes {
  className: string
  disabled?: true
  'aria-busy'?: 'true'
  'aria-label'?: string
  'data-loading'?: 'true'
}

export interface ButtonOptions {
  variant?: ButtonVariant
  loading?: boolean
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
  ariaLabel?: string
}

const defaultVariant: ButtonVariant = 'primary'

export function getButtonClassName({ variant = defaultVariant, loading = false, className }: ButtonOptions = {}) {
  return ['guide-button', `guide-button-${variant}`, loading ? 'is-loading' : '', className ?? '']
    .filter(Boolean)
    .join(' ')
}

export function getButtonAttributes({ variant = defaultVariant, loading = false, disabled = false, className, ariaLabel }: ButtonOptions = {}): ButtonAttributes {
  return {
    className: getButtonClassName({ variant, loading, disabled, className }),
    ...(disabled || loading ? { disabled: true } : {}),
    ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
    ...(loading ? { 'aria-busy': 'true' as const, 'data-loading': 'true' as const } : {}),
  }
}

export function createButton(content: string | Node = '', options: ButtonOptions = {}) {
  if (typeof document === 'undefined') {
    throw new Error('createButton requires a browser document')
  }

  const button = document.createElement('button')
  const { type = 'button' } = options
  const attributes = getButtonAttributes(options)

  button.type = type
  button.className = attributes.className
  button.disabled = attributes.disabled === true
  if (attributes['aria-label']) button.setAttribute('aria-label', attributes['aria-label'])
  if (attributes['aria-busy']) button.setAttribute('aria-busy', attributes['aria-busy'])
  if (attributes['data-loading']) button.dataset.loading = attributes['data-loading']
  if (typeof content === 'string') button.textContent = content
  else button.append(content)

  return button
}

export const Button = createButton
