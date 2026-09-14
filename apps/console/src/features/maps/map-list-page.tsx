import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MapAssetSummary } from '@guide/contracts'
import { ApiClientError } from '../../api/client'
import { useConfirmModalController, useToastStackController } from '../../ui-adapters'
import { LegacyEmptyIllustration } from '../../ui/legacy-empty-illustration'
import { deleteMap, listMaps, mapsQueryKey } from './maps-api'
import { MapUploadModal } from './map-upload-modal'

const mapDateFormatter = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' })
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
  const showHeaderAction = !mapsQuery.isSuccess || maps.length > 0
  return (
    <section className="page-section" aria-labelledby="maps-title">
      <div className="page-heading">
        <div>
          <h1 id="maps-title">地图</h1>
          <p className="page-summary">管理导览使用的地图</p>
        </div>
        {showHeaderAction ? <button ref={addButtonRef} className="guide-button guide-button-primary" type="button" onClick={() => setUploadOpen(true)}>
          <Plus aria-hidden="true" size={16} strokeWidth={2.2} />添加地图
        </button> : null}
      </div>
      {mapsQuery.isLoading ? <div className="state-panel">正在加载地图</div> : null}
      {mapsQuery.isError ? <div className="state-panel state-error">暂时无法加载地图，请检查本地服务。</div> : null}
      {mapsQuery.isSuccess && maps.length === 0 ? (
        <div className="guide-empty">
          <div className="guide-empty-icon" aria-hidden="true"><LegacyEmptyIllustration kind="map" /></div>
          <h2 className="guide-empty-title">暂无地图</h2>
          <p className="guide-empty-description">上传地图后，即可创建导览任务</p>
          <button ref={addButtonRef} className="guide-button guide-button-primary guide-empty-action" type="button" onClick={() => setUploadOpen(true)}>
            <Plus aria-hidden="true" size={16} strokeWidth={2.2} />添加地图
          </button>
        </div>
      ) : null}
      {mapsQuery.isSuccess && maps.length > 0 ? (
        <div className="table-wrap guide-table-scroll">
          <table className="guide-table map-table" aria-label="地图列表">
            <thead className="guide-table-head"><tr className="guide-table-row">
              <th className="guide-table-header-cell">地图名称</th>
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
                  <td className="guide-table-cell">{mapDateFormatter.format(new Date(map.createdAt))}</td>
                  <td className="guide-table-cell guide-table-cell-actions actions-cell" onClick={(event) => event.stopPropagation()}>
                    <button className="guide-button guide-button-icon" type="button" aria-label={`编辑 ${map.name}`} title="编辑" onClick={() => navigate(`/maps/${map.id}`, { state: { edit: true } })}><Pencil aria-hidden="true" size={16} strokeWidth={1.8} /></button>
                    <button className="guide-button guide-button-icon guide-button-icon-danger" type="button" aria-label={`删除 ${map.name}`} title="删除" onClick={(event) => { setDeleteTrigger(event.currentTarget); setPendingDelete(map) }}><Trash2 aria-hidden="true" size={16} strokeWidth={1.8} /></button>
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
        onUploaded={() => showToast({ variant: 'success', title: '地图已添加', message: '地图资源已保存。' })}
      />
    </section>
  )
}
