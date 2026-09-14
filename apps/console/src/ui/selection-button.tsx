import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'

type SelectionButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

export const SelectionButton = forwardRef<HTMLButtonElement, SelectionButtonProps>(function SelectionButton({ className = '', type = 'button', ...props }, ref) {
  return <button ref={ref} className={`guide-button guide-button-secondary selection-button ${className}`.trim()} type={type} {...props} />
})
