import { ArrowLeft, Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export function NewTaskPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const navigationState = location.state as { mode?: string; taskId?: string } | null
  const isEditing = navigationState?.mode === 'edit' && Boolean(navigationState.taskId)
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [mapName, setMapName] = useState('')
  const [points, setPoints] = useState([{ name: '', description: '' }])
  const [action, setAction] = useState('语音播报')
  const [notice, setNotice] = useState('')

  const canContinue = step === 1 ? Boolean(name.trim() && mapName.trim()) : step === 2 ? points.some((point) => point.name.trim()) : true

  const addPoint = () => setPoints((current) => [...current, { name: '', description: '' }])
  const updatePoint = (index: number, key: 'name' | 'description', value: string) => {
    setPoints((current) => current.map((point, pointIndex) => pointIndex === index ? { ...point, [key]: value } : point))
  }

  return (
    <section className="page-section" aria-labelledby="new-task-title">
      <div className="page-heading">
        <div>
          <button className="guide-button guide-button-text editor-back" type="button" onClick={() => navigate('/tour-tasks')}>
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.8} />
            返回任务列表
          </button>
          <h1 id="new-task-title">{isEditing ? '编辑导览任务' : '新建导览任务'}</h1>
          <p className="page-summary">按三个步骤完成导览任务配置，当前内容仅保留在本地编辑状态。</p>
        </div>
      </div>
      <ol className="editor-stepper" aria-label="任务编辑步骤">
        {['基本信息', '点位设置', '动作编排'].map((label, index) => {
          const stepNumber = index + 1
          return (
            <li className={`editor-step${step === stepNumber ? ' is-current' : step > stepNumber ? ' is-complete' : ''}`} key={label}>
              <button type="button" onClick={() => stepNumber < step && setStep(stepNumber)} disabled={stepNumber > step} aria-current={step === stepNumber ? 'step' : undefined}>
                <span className="editor-step-number">{step > stepNumber ? <Check aria-hidden="true" size={14} /> : stepNumber}</span>
                <span>{label}</span>
              </button>
              {stepNumber < 3 ? <ChevronRight className="editor-step-divider" aria-hidden="true" size={16} /> : null}
            </li>
          )
        })}
      </ol>
      <div className="editor-card">
        {step === 1 ? (
          <div className="editor-panel" aria-labelledby="editor-step-title">
            <h2 id="editor-step-title">基本信息</h2>
            <p className="editor-help">先填写任务名称和使用的地图。</p>
            <div className="editor-form-grid">
              <label className="editor-field">
                <span>任务名称</span>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：王府井大厅导览" />
              </label>
              <label className="editor-field">
                <span>地图名称</span>
                <input value={mapName} onChange={(event) => setMapName(event.target.value)} placeholder="选择或输入地图名称" />
              </label>
            </div>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="editor-panel" aria-labelledby="editor-step-title">
            <div className="editor-panel-heading"><div><h2 id="editor-step-title">点位设置</h2><p className="editor-help">添加导览过程中需要经过的点位。</p></div><button className="guide-button guide-button-secondary" type="button" onClick={addPoint}><Plus aria-hidden="true" size={16} />添加点位</button></div>
            <div className="point-list">
              {points.map((point, index) => (
                <div className="point-editor" key={`point-${index}`}>
                  <span className="point-index">{index + 1}</span>
                  <label className="editor-field"><span>点位名称</span><input value={point.name} onChange={(event) => updatePoint(index, 'name', event.target.value)} placeholder="例如：大厅入口" /></label>
                  <label className="editor-field"><span>讲解说明</span><input value={point.description} onChange={(event) => updatePoint(index, 'description', event.target.value)} placeholder="可选" /></label>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {step === 3 ? (
          <div className="editor-panel" aria-labelledby="editor-step-title">
            <h2 id="editor-step-title">动作编排</h2>
            <p className="editor-help">选择机器人到达点位后的默认动作。</p>
            <label className="editor-field editor-field-narrow"><span>默认动作</span><select value={action} onChange={(event) => setAction(event.target.value)}><option>语音播报</option><option>等待确认</option><option>拍照记录</option></select></label>
            <div className="editor-summary" aria-live="polite"><strong>{name || '未命名任务'}</strong><span>{mapName || '未选择地图'} · {points.filter((point) => point.name.trim()).length} 个点位 · {action}</span></div>
          </div>
        ) : null}
        {notice ? <p className="editor-notice" role="status">{notice}</p> : null}
        <div className="editor-actions">
          <button className="guide-button guide-button-secondary" type="button" onClick={() => step === 1 ? navigate('/tour-tasks') : setStep((current) => current - 1)}>
            <ChevronLeft aria-hidden="true" size={16} />
            {step === 1 ? '取消' : '上一步'}
          </button>
          {step < 3 ? <button className="guide-button guide-button-primary" type="button" disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>下一步<ChevronRight aria-hidden="true" size={16} /></button> : <button className="guide-button guide-button-primary" type="button" onClick={() => setNotice('保存接口尚未接入，当前仅保留本地草稿。')}><Check aria-hidden="true" size={16} />保存草稿</button>}
        </div>
      </div>
    </section>
  )
}
