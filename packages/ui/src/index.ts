export {
  Button,
  buttonVariants,
  createButton,
  getButtonAttributes,
  getButtonClassName,
} from './button.js'
export type { ButtonAttributes, ButtonOptions, ButtonVariant } from './button.js'

export { Table, createTable, tableClasses } from './table.js'
export type { TableCellAlign, TableColumn, TableOptions } from './table.js'

export { Tag, createTag, getTagAttributes, getTagClassName, tagClasses, tagVariants } from './tag.js'
export type { TagAttributes, TagOptions, TagVariant } from './tag.js'

export { Empty, createEmpty, emptyClasses, getEmptyClassName } from './empty-state.js'
export type { EmptyActionOptions, EmptyOptions } from './empty-state.js'

export {
  Popover,
  createPopover,
  getPopoverAttributes,
  getPopoverClassName,
  popoverClasses,
  popoverPlacements,
} from './popover.js'
export type { PopoverAttributes, PopoverElement, PopoverOptions, PopoverPlacement } from './popover.js'

export {
  ConfirmModal,
  confirmModalClasses,
  Modal,
  createConfirmModal,
  createModal,
  getConfirmModalClassName,
  getModalClassName,
  modalClasses,
} from './modal.js'
export type {
  ConfirmModalActionOptions,
  ConfirmModalElement,
  ConfirmModalOptions,
  ModalActionOptions,
  ModalElement,
  ModalOptions,
} from './modal.js'

export {
  Toast,
  ToastStack,
  createToast,
  createToastStack,
  getToastAttributes,
  getToastClassName,
  toastClasses,
  toastPositions,
  toastVariants,
} from './toast.js'
export type {
  ToastAttributes,
  ToastElement,
  ToastOptions,
  ToastPosition,
  ToastStackElement,
  ToastStackOptions,
  ToastVariant,
} from './toast.js'

export const hichatDesignSystemVersion = '1.1'
