import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileUp, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { ApiClientError } from '../../api/client'
import { useConfirmModalController } from '../../ui-adapters'
import { mapsQueryKey, uploadMap } from './maps-api'

interface MapUploadModalProps {
  open: boolean
  trigger: HTMLElement | null
  onClose: () => void
  onUploaded: () => void
}

function extensionMatches(file: File | null, extension: string) {
  return Boolean(file?.name.toLowerCase().endsWith(extension))
}

interface MapFilePickerProps {
  label: string
  accept: string
  file: File | null
  error?: string
  onChange: (file: File | null) => void
}

function MapFilePicker({ label, accept, file, error, onChange }: MapFilePickerProps) {
  const inputId = useId()
  const errorId = `${inputId}-error`
  return (
    <div className="editor-field map-file-field">
      <span>{label}</span>
      <input
        className="map-file-input"
        id={inputId}
        aria-label={label}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        type="file"
        accept={accept}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <label className="map-file-picker" htmlFor={inputId}>
        <span className="map-file-picker-action"><FileUp aria-hidden="true" size={15} strokeWidth={1.8} />选择文件</span>
        <span className="map-file-picker-name" title={file?.name}>{file?.name ?? '未选择文件'}</span>
      </label>
      {error ? <small className="editor-field-error" id={errorId} role="alert">{error}</small> : null}
    </div>
  )
}

export function MapUploadModal({ open, trigger, onClose, onUploaded }: MapUploadModalProps) {
  const queryClient = useQueryClient()
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const nameRef = useRef<HTMLInputElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const requestCloseRef = useRef<() => void>(() => undefined)
  const [name, setName] = useState('')
  const [bundle, setBundle] = useState<File | null>(null)
  const [errors, setErrors] = useState<{ name?: string; bundle?: string; form?: string }>({})
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)
  const dirty = Boolean(name || bundle)

  const resetAndClose = () => {
    setName('')
    setBundle(null)
    setErrors({})
    setConfirmingDiscard(false)
    onClose()
  }

  const requestClose = () => {
    if (uploadMutation.isPending) return
    if (dirty) setConfirmingDiscard(true)
    else resetAndClose()
  }
  requestCloseRef.current = requestClose

  const uploadMutation = useMutation({
    mutationFn: uploadMap,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mapsQueryKey })
      resetAndClose()
      onUploaded()
    },
    onError: (reason) => {
      setErrors({ form: reason instanceof ApiClientError ? reason.message : '上传失败，请检查文件后重试。' })
    },
  })

  useConfirmModalController({
    open: confirmingDiscard,
    title: '放弃未上传的地图？',
    description: '已选择的地图文件和填写的名称将被清空。',
    trigger: closeButtonRef.current,
    confirmLabel: '放弃上传',
    cancelLabel: '继续编辑',
    onConfirm: resetAndClose,
    onCancel: () => setConfirmingDiscard(false),
  })

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.requestAnimationFrame(() => nameRef.current?.focus())

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ))
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      if (trigger?.isConnected) trigger.focus()
    }
  }, [open, trigger])

  if (!open) return null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: { name?: string; bundle?: string } = {}
    if (!name.trim()) nextErrors.name = '请输入地图名称。'
    if (!extensionMatches(bundle, '.zip')) nextErrors.bundle = '请选择 .zip 地图包。'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    uploadMutation.mutate({ name: name.trim(), bundle: bundle! })
  }

  const stopFormPropagation = (event: ReactKeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement && event.target.type === 'file') {
      event.preventDefault()
    }
  }

  return createPortal(
    <div className="guide-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && requestClose()}>
      <div ref={dialogRef} className="guide-modal map-upload-modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="guide-modal-header">
          <h2 className="guide-modal-title" id={titleId}>添加地图</h2>
          <button ref={closeButtonRef} className="guide-modal-close" type="button" aria-label="关闭" onClick={requestClose} disabled={uploadMutation.isPending}>
            <X aria-hidden="true" size={18} strokeWidth={1.8} />
          </button>
        </div>
        <form onSubmit={submit} onKeyDown={stopFormPropagation} noValidate>
          <div className="guide-modal-content map-upload-fields">
            <label className="editor-field">
              <span>地图名称</span>
              <input ref={nameRef} aria-label="地图名称" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? `${titleId}-name-error` : undefined} value={name} maxLength={120} onChange={(event) => { setName(event.target.value); setErrors((current) => ({ ...current, name: undefined })) }} placeholder="请输入地图名称" />
              {errors.name ? <small className="editor-field-error" id={`${titleId}-name-error`} role="alert">{errors.name}</small> : null}
            </label>
            <MapFilePicker label="地图文件" accept=".zip,application/zip,application/x-zip-compressed" file={bundle} error={errors.bundle} onChange={(file) => { setBundle(file); setErrors((current) => ({ ...current, bundle: undefined })) }} />
            <p className="map-upload-help">ZIP 内需包含一个 PCD 三维地图、一个 PNG 二维地图和一个 JSON 配准文件。</p>
            {errors.form ? <p className="map-form-error" role="alert">{errors.form}</p> : null}
          </div>
          <div className="guide-modal-footer">
            <button className="guide-button guide-button-secondary" type="button" onClick={requestClose} disabled={uploadMutation.isPending}>取消</button>
            <button className="guide-button guide-button-primary" type="submit" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? '上传中' : '确定'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
