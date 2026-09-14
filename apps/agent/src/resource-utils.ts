export type LocalTaskRecord = {
  id: string
  name: string
  mapName: string
  mapId: string
  version: number
}

/** Normalizes persisted task records while keeping records created before mapId was introduced. */
export function normalizeLocalTasks(value: unknown): LocalTaskRecord[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((task): LocalTaskRecord[] => {
    if (!task || typeof task !== 'object') return []
    const candidate = task as Record<string, unknown>
    if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || typeof candidate.mapName !== 'string' || typeof candidate.version !== 'number') return []
    return [{
      id: candidate.id,
      name: candidate.name,
      mapName: candidate.mapName,
      mapId: typeof candidate.mapId === 'string' ? candidate.mapId : '',
      version: candidate.version,
    }]
  })
}

export function mapStillReferenced(tasks: LocalTaskRecord[], mapId: string, excludingTaskId?: string) {
  return tasks.some((task) => task.id !== excludingTaskId && task.mapId === mapId)
}
