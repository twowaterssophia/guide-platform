import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileImage, Pencil } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiClientError } from '../../api/client'
import { useConfirmModalController, useToastStackController } from '../../ui-adapters'
import { MapActionsMenu } from './map-actions-menu'
import { deleteMap, getMap, mapPreviewUrl, mapsQueryKey, renameMap } from './maps-api'
import { formatFileSize } from './map-list-page'

const detailDateFormatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long', timeStyle: 'short' })

export function MapDetailPage() {
  const { mapId = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showToast = useToastStackController()
  const [editing, setEditing] = useState(() => Boolean((location.state as { edit?: boolean } | null)?.edit))
  const [name, setName] = useState('')
  const [renameError, setRenameError] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteTrigger, setDeleteTrigger] = useState<HTMLElement | null>(null)
  const mapQuery = useQuery({ queryKey: [...mapsQueryKey, mapId], queryFn: () => getMap(mapId), enabled: Boolean(mapId) })
  const renameMutation = useMutation({
    mutationFn: (nextName: string) => renameMap(mapId, { name: nextName, expectedVersion: mapQuery.data!.version }),
    onSuccess: async (updated) => {
      queryClient.setQueryData([...mapsQueryKey, mapId], updated)
      await queryClient.invalidateQueries({ queryKey: mapsQueryKey })
      setEditing(false)
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

  if (mapQuery.isLoading) return <section className="page-section"><div className="state-panel">正在加载地图详情</div></section>
  if (mapQuery.isError || !mapQuery.data) return <section className="page-section"><div className="state-panel state-error">无法加载该地图，请返回列表后重试。</div></section>
  const map = mapQuery.data
  const registration = map.registration

  const beginRename = () => {
    setName(map.name)
    setRenameError('')
    setEditing(true)
  }

  return (
    <section className="page-section map-detail-page" aria-labelledby="map-detail-title">
      <div className="page-heading map-detail-heading">
        <div>
          <button className="guide-button guide-button-text editor-back" type="button" onClick={() => navigate('/maps')}>
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} />返回地图列表
          </button>
          {editing ? (
            <form className="map-rename-form" onSubmit={(event) => { event.preventDefault(); if (name.trim()) renameMutation.mutate(name.trim()) }}>
              <h1 id="map-detail-title">{map.name}</h1>
              <label className="editor-field"><span>地图名称</span><input autoFocus aria-label="地图名称" value={name || map.name} maxLength={120} onChange={(event) => setName(event.target.value)} /></label>
              <div className="map-rename-actions">
                <button className="guide-button guide-button-secondary" type="button" onClick={() => setEditing(false)} disabled={renameMutation.isPending}>取消</button>
                <button className="guide-button guide-button-primary" type="submit" disabled={renameMutation.isPending || !(name || map.name).trim()}>{renameMutation.isPending ? '保存中' : '保存'}</button>
              </div>
              {renameError ? <p className="map-form-error" role="alert">{renameError}</p> : null}
            </form>
          ) : (
            <div><h1 id="map-detail-title">{map.name}</h1><p className="page-summary">创建于 {detailDateFormatter.format(new Date(map.createdAt))}</p></div>
          )}
        </div>
        {!editing ? (
          <div className="persona-detail-actions">
            <button className="guide-button guide-button-secondary" type="button" onClick={beginRename}><Pencil aria-hidden="true" size={16} strokeWidth={1.8} />编辑名称</button>
            <MapActionsMenu mapName={map.name} onDelete={(trigger) => { setDeleteTrigger(trigger); setConfirmingDelete(true) }} />
          </div>
        ) : null}
      </div>

      <div className="map-detail-layout">
        <section className="map-preview-section" aria-labelledby="map-preview-title">
          <div className="map-section-heading"><div><h2 id="map-preview-title">二维地图</h2><p>{map.preview ? `${map.preview.width} × ${map.preview.height} px` : '当前资源没有可用预览'}</p></div><FileImage aria-hidden="true" size={20} strokeWidth={1.8} /></div>
          <div className="map-preview-frame">
            {map.preview ? <img src={mapPreviewUrl(map.preview.url)} alt={`${map.name} 二维地图预览`} /> : <div className="map-preview-unavailable">预览不可用</div>}
          </div>
        </section>

        <section className="map-metadata-section" aria-labelledby="map-file-title">
          <h2 id="map-file-title">文件与配准</h2>
          <dl className="map-metadata-list">
            <div><dt>PCD 文件</dt><dd title={map.pcd.fileName}>{map.pcd.fileName}</dd></div>
            <div><dt>PCD 编码</dt><dd>{map.pcdEncoding ?? '待识别'}</dd></div>
            <div><dt>文件大小</dt><dd>{formatFileSize(map.pcd.sizeBytes)}</dd></div>
            <div><dt>关联任务</dt><dd>{map.referencedTaskCount} 个</dd></div>
            <div><dt>坐标系</dt><dd>{registration?.frameId ?? '未提供'}</dd></div>
            <div><dt>分辨率</dt><dd>{registration ? `${registration.resolution} m/px` : '未提供'}</dd></div>
            <div><dt>地图原点</dt><dd>{registration ? `${registration.origin.x}, ${registration.origin.y}, ${registration.origin.yaw}` : '未提供'}</dd></div>
            <div><dt>更新时间</dt><dd>{detailDateFormatter.format(new Date(map.updatedAt))}</dd></div>
          </dl>
        </section>
      </div>
    </section>
  )
}
