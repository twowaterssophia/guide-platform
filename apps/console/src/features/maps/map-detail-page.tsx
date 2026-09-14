import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Trash2, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiClientError } from '../../api/client'
import { useConfirmModalController, useToastStackController } from '../../ui-adapters'
import { deleteMap, getMap, mapPreviewUrl, mapsQueryKey, renameMap } from './maps-api'

const detailDateFormatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long', timeStyle: 'short' })

interface MapRenameDialogProps {
  open: boolean
  name: string
  error: string
  pending: boolean
  trigger: HTMLElement | null
  onNameChange: (name: string) => void
  onSave: () => void
  onClose: () => void
}

function MapRenameDialog({ open, name, error, pending, trigger, onNameChange, onSave, onClose }: MapRenameDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    window.requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLInputElement>('input')?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (trigger?.isConnected) trigger.focus()
    }
  }, [onClose, open, trigger])

  if (!open) return null

  return createPortal(
    <div className="guide-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialogRef} className="guide-modal map-rename-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="guide-modal-header">
          <h2 className="guide-modal-title" id={titleId}>编辑地图名称</h2>
          <button className="guide-modal-close" type="button" aria-label="关闭" disabled={pending} onClick={onClose}><X aria-hidden="true" size={18} /></button>
        </div>
        <form noValidate onSubmit={(event) => { event.preventDefault(); onSave() }}>
          <div className="guide-modal-content">
            <label className="editor-field">
              <span>地图名称</span>
              <input aria-label="地图名称" aria-invalid={Boolean(error)} value={name} maxLength={120} onChange={(event) => onNameChange(event.target.value)} />
              {error ? <small className="editor-field-error" role="alert">{error}</small> : null}
            </label>
          </div>
          <div className="guide-modal-footer">
            <button className="guide-button guide-button-secondary" type="button" disabled={pending} onClick={onClose}>取消</button>
            <button className="guide-button guide-button-primary" type="submit" disabled={pending}>{pending ? '保存中' : '保存'}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

export function MapDetailPage() {
  const { mapId = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showToast = useToastStackController()
  const [renameOpen, setRenameOpen] = useState(() => Boolean((location.state as { edit?: boolean } | null)?.edit))
  const [name, setName] = useState('')
  const [renameError, setRenameError] = useState('')
  const [renameTrigger, setRenameTrigger] = useState<HTMLElement | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteTrigger, setDeleteTrigger] = useState<HTMLElement | null>(null)
  const mapQuery = useQuery({ queryKey: [...mapsQueryKey, mapId], queryFn: () => getMap(mapId), enabled: Boolean(mapId) })
  const renameMutation = useMutation({
    mutationFn: (nextName: string) => renameMap(mapId, { name: nextName, expectedVersion: mapQuery.data!.version }),
    onSuccess: async (updated) => {
      queryClient.setQueryData([...mapsQueryKey, mapId], updated)
      await queryClient.invalidateQueries({ queryKey: mapsQueryKey })
      setRenameOpen(false)
      setRenameTrigger(null)
      setRenameError('')
      showToast({ variant: 'success', title: '地图名称已更新', message: `当前名称为“${updated.name}”。` })
    },
    onError: (reason) => setRenameError(reason instanceof ApiClientError ? reason.message : '保存失败，请刷新后重试。'),
  })
  const deleteMutation = useMutation({
    mutationFn: () => deleteMap(mapId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mapsQueryKey })
      showToast({ variant: 'success', title: '地图已删除', message: '地图文件和配准信息已移除。' })
      navigate('/maps', { replace: true })
    },
    onError: (reason) => showToast({
      variant: 'error',
      title: '无法删除地图',
      message: reason instanceof ApiClientError ? reason.message : '请刷新后重试。',
    }),
  })

  useConfirmModalController({
    open: confirmingDelete,
    title: mapQuery.data ? `确认删除“${mapQuery.data.name}”？` : '',
    description: '地图文件、二维预览和配准信息将被永久删除。此操作不可撤销。',
    trigger: deleteTrigger,
    onConfirm: () => {
      setConfirmingDelete(false)
      setDeleteTrigger(null)
      deleteMutation.mutate()
    },
    onCancel: () => {
      setConfirmingDelete(false)
      setDeleteTrigger(null)
    },
  })

  const loadedMapName = mapQuery.data?.name
  useEffect(() => {
    if (!renameOpen || !loadedMapName) return
    setName(loadedMapName)
    setRenameError('')
  }, [loadedMapName, renameOpen])

  if (mapQuery.isLoading) return <section className="page-section"><div className="state-panel">正在加载地图详情</div></section>
  if (mapQuery.isError || !mapQuery.data) return <section className="page-section"><div className="state-panel state-error">无法加载该地图，请返回列表后重试。</div></section>
  const map = mapQuery.data
  const isSquarePreview = Boolean(map.registration && map.registration.width > 1 && map.registration.width === map.registration.height)

  const closeRename = () => {
    if (renameMutation.isPending) return
    setRenameOpen(false)
    setRenameTrigger(null)
    setRenameError('')
  }
  const saveRename = () => {
    const nextName = name.trim()
    if (!nextName) {
      setRenameError('请输入地图名称。')
      return
    }
    renameMutation.mutate(nextName)
  }

  return (
    <section className="page-section map-detail-page" aria-labelledby="map-detail-title">
      <div className="page-heading map-detail-heading">
        <div>
          <button className="guide-button guide-button-text editor-back" type="button" onClick={() => navigate('/maps')}>
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} />返回地图列表
          </button>
          <div><h1 id="map-detail-title">{map.name}</h1><p className="page-summary">创建于 {detailDateFormatter.format(new Date(map.createdAt))}</p></div>
        </div>
        <div className="detail-heading-actions">
          <button className="guide-button guide-button-secondary" type="button" onClick={(event) => { setRenameTrigger(event.currentTarget); setRenameOpen(true) }}><Pencil aria-hidden="true" size={16} strokeWidth={1.8} />编辑名称</button>
          <button className="guide-button guide-button-danger-outline" type="button" onClick={(event) => { setDeleteTrigger(event.currentTarget); setConfirmingDelete(true) }}><Trash2 aria-hidden="true" size={16} strokeWidth={1.8} />删除</button>
        </div>
      </div>

      <div className="map-detail-layout">
        <section className="map-preview-section" aria-labelledby="map-preview-title">
          <div className="map-section-heading"><div><h2 id="map-preview-title">二维地图</h2></div></div>
          <div className={`map-preview-frame${isSquarePreview ? ' is-square' : ''}`}>
            {map.preview ? <img src={mapPreviewUrl(map.preview.url)} alt={`${map.name} 二维地图预览`} /> : <div className="map-preview-unavailable">预览不可用</div>}
          </div>
        </section>

      </div>
      <MapRenameDialog open={renameOpen} name={name} error={renameError} pending={renameMutation.isPending} trigger={renameTrigger} onNameChange={(nextName) => { setName(nextName); setRenameError('') }} onSave={saveRename} onClose={closeRename} />
    </section>
  )
}
