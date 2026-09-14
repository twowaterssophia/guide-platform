interface TaskPathTitleProps {
  from: string
  to: string
}

export function taskPointTitle(name: string, fallback: string) {
  return name.trim() || fallback
}

export function TaskPathTitle({ from, to }: TaskPathTitleProps) {
  return <h3 className="task-path-title" aria-label={`${from} 到 ${to}`}><span>{from}</span><span aria-hidden="true">→</span><span>{to}</span></h3>
}
