import { Check, Flag, MoveRight } from 'lucide-react'
import type { RobotPosition, RobotRuntimeState, TaskAction, TourTaskDetail } from '@guide/contracts'
import { TaskPathTitle } from '../tour-tasks/task-title'

export type TourFlowEntry = {
  id: string
  kind: 'ARRIVAL' | 'ACTION' | 'MOVE'
  stage: 'POINT' | 'PATH'
  pointName: string
  pointIndex: number
  target: RobotPosition
  actionType?: TaskAction['type']
  content: string
  title: string
  description?: string
}

const actionLabels = { SPEECH: '语音播报', SKILL: '执行技能', INTERACTION: '语音问答' }

export function RobotTourFlow({ task, flow, runtime }: {
  task: TourTaskDetail
  flow: TourFlowEntry[]
  runtime: RobotRuntimeState
}) {
  const renderActions = (pointIndex: number, stage: TourFlowEntry['stage']) => (
    <ol className="rc-flow-actions">
      {flow.flatMap((entry, index) => {
        if (entry.pointIndex !== pointIndex || entry.stage !== stage) return []
        const complete = runtime.execution === 'ENDED' || index < runtime.currentFlowIndex
        const current = (runtime.execution === 'RUNNING' || runtime.execution === 'PAUSED') && index === runtime.currentFlowIndex
        const label = entry.actionType ? actionLabels[entry.actionType] : entry.kind === 'MOVE' ? '移动' : '抵达点位'
        return [<li className={`rc-flow-action${complete ? ' is-complete' : ''}${current ? ' is-current' : ''}`} key={entry.id} aria-current={current ? 'step' : undefined}>
          <span className="task-action-type-label">{label}</span>
          <span className="rc-flow-action-content">{entry.content}</span>
          {current ? <span className="rc-flow-now">{runtime.execution === 'PAUSED' ? '已暂停' : '进行中'}</span> : complete ? <Check className="rc-flow-complete" aria-label="已完成" size={16} /> : null}
        </li>]
      })}
    </ol>
  )

  return (
    <div className="task-action-sections rc-flow-list" id="rc-tour-flow">
      {task.points.flatMap((point, index) => {
        const sections = [<section className="task-action-section rc-flow-section" key={`point-${point.id}`} aria-label={`点位 ${point.name}`}>
          <div className="task-action-section-heading"><div className="task-action-section-title"><Flag aria-hidden="true" size={16} /><h3>{point.name}</h3></div></div>
          {renderActions(index, 'POINT')}
        </section>]
        const next = task.points[index + 1]
        if (next) sections.push(<section className="task-action-section task-action-path rc-flow-section" key={`path-${point.id}-${next.id}`} aria-label={`路径 ${point.name} 到 ${next.name}`}>
          <div className="task-action-section-heading"><div className="task-action-section-title"><MoveRight aria-hidden="true" size={16} /><TaskPathTitle from={point.name} to={next.name} /></div></div>
          {renderActions(index, 'PATH')}
        </section>)
        return sections
      })}
    </div>
  )
}
