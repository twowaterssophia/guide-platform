import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileImage, Map, Plus } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MapAssetSummary } from '@guide/contracts'
import { ApiClientError } from '../../api/client'
import { useConfirmModalController, useToastStackController } from '../../ui-adapters'
import { MapActionsMenu } from './map-actions-menu'
import { deleteMap, listMaps, mapsQueryKey } from './maps-api'
import { MapUploadModal } from './map-upload-modal'

const mapDateFormatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })
const encodingLabels = { ascii: 'ASCII', binary: 'Binary', binary_compressed: 'Binary compressed' } as const

export function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`
}

export function MapListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showToast = useToastStackController()
  const addButtonRef = useRef<HTMLButtonElement | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<MapAssetSummary | null>(null)
  const [deleteTrigger, setDeleteTrigger] = useState<HTMLElement | null>(null)
  const mapsQuery = useQuery({ queryKey: mapsQueryKey, queryFn: listMaps })
  const deleteMutation = useMutation({
    mutationFn: deleteMap,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: mapsQueryKey })
      showToast({ variant: 'success', title: '地图已删除', message: '地图文件和配准信息已移除。' })
    },
    onError: (reason) => showToast({
      variant: 'error',
      title: '无法删除地图',
      message: reason instanceof ApiClientError ? reason.message : '请刷新后重试。',
    }),
  })

  useConfirmModalController({
    open: Boolean(pendingDelete),
    title: pendingDelete ? `确认删除“${pendingDelete.name}”？` : '',
    description: '地图文件、二维预览和配准信息将被永久删除。此操作不可撤销。',
    trigger: deleteTrigger,
    onConfirm: () => {
      const map = pendingDelete
      setPendingDelete(null)
      setDeleteTrigger(null)
      if (map) deleteMutation.mutate(map.id)
    },
    onCancel: () => {
      setPendingDelete(null)
      setDeleteTrigger(null)
    },
  })

  const maps = mapsQuery.data?.items ?? []
  return (
    <section className="page-section" aria-labelledby="maps-title">
      <div className="page-heading">
        <div>
          <h1 id="maps-title">地图</h1>
          <p className="page-summary">管理导览任务使用的三维地图和二维预览。</p>
        </div>
        <button ref={addButtonRef} className="guide-button guide-button-primary" type="button" onClick={() => setUploadOpen(true)}>
          <Plus aria-hidden="true" size={16} strokeWidth={2.2} />添加地图
        </button>
      </div>
      {mapsQuery.isLoading ? <div className="state-panel">正在加载地图</div> : null}
      {mapsQuery.isError ? <div className="state-panel state-error">暂时无法加载地图，请检查本地服务。</div> : null}
      {mapsQuery.isSuccess && maps.length === 0 ? (
        <div className="guide-empty">
          <div className="guide-empty-icon" aria-hidden="true"><Map size={42} strokeWidth={1.35} /></div>
          <h2 className="guide-empty-title">暂无地图资产</h2>
          <p className="guide-empty-description">添加地图后，可用于配置导览任务的点位和路径。</p>
          <button className="guide-button guide-button-primary guide-empty-action" type="button" onClick={() => setUploadOpen(true)}>
            <Plus aria-hidden="true" size={16} strokeWidth={2.2} />添加地图
          </button>
        </div>
      ) : null}
      {mapsQuery.isSuccess && maps.length > 0 ? (
        <div className="table-wrap guide-table-scroll">
          <table className="guide-table map-table" aria-label="地图列表">
            <thead className="guide-table-head"><tr className="guide-table-row">
              <th className="guide-table-header-cell">地图名称</th>
              <th className="guide-table-header-cell">PCD 文件</th>
              <th className="guide-table-header-cell">编码</th>
              <th className="guide-table-header-cell">二维预览</th>
              <th className="guide-table-header-cell">创建时间</th>
              <th className="guide-table-header-cell guide-table-header-cell-actions actions-column">操作</th>
            </tr></thead>
            <tbody className="guide-table-body">
              {maps.map((map) => (
                <tr
                  className="guide-table-row guide-table-row-interactive"
                  key={map.id}
                  tabIndex={0}
                  aria-label={`查看地图 ${map.name}`}
                  onClick={() => navigate(`/maps/${map.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      navigate(`/maps/${map.id}`)
                    }
                  }}
                >
                  <td className="guide-table-cell guide-table-cell-name task-name" title={map.name}>{map.name}</td>
                  <td className="guide-table-cell"><span className="map-file-name" title={map.pcdFileName}>{map.pcdFileName}</span><small>{formatFileSize(map.pcdSizeBytes)}</small></td>
                  <td className="guide-table-cell">{map.pcdEncoding ? encodingLabels[map.pcdEncoding] : '待识别'}</td>
                  <td className="guide-table-cell"><span className={`guide-tag guide-tag-${map.previewAvailable ? 'success' : 'default'}`}><FileImage aria-hidden="true" size={14} />{map.previewAvailable ? '可查看' : '不可用'}</span></td>
                  <td className="guide-table-cell">{mapDateFormatter.format(new Date(map.createdAt))}</td>
                  <td className="guide-table-cell guide-table-cell-actions actions-cell" onClick={(event) => event.stopPropagation()}>
                    <MapActionsMenu
                      mapName={map.name}
                      onEdit={() => navigate(`/maps/${map.id}`, { state: { edit: true } })}
                      onDelete={(trigger) => {
                        setDeleteTrigger(trigger)
                        setPendingDelete(map)
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <MapUploadModal
        open={uploadOpen}
        trigger={addButtonRef.current}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => showToast({ variant: 'success', title: '地图已添加', message: 'PCD、二维预览和配准信息已保存。' })}
      />
    </section>
  )
}
