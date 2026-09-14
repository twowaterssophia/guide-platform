import { describe, expect, it } from 'vitest'
import { mapStillReferenced, normalizeLocalTasks } from './resource-utils'

describe('agent local resource records', () => {
  it('migrates legacy task records without discarding them', () => {
    expect(normalizeLocalTasks([
      { id: 'legacy', name: '旧任务', mapName: '旧地图', version: 1 },
      { id: 'invalid', name: '缺版本' },
    ])).toEqual([{ id: 'legacy', name: '旧任务', mapName: '旧地图', mapId: '', version: 1 }])
  })

  it('keeps a map while another local task references it', () => {
    const tasks = [
      { id: 'one', name: '一', mapName: '地图', mapId: 'map-1', version: 1 },
      { id: 'two', name: '二', mapName: '地图', mapId: 'map-1', version: 1 },
    ]
    expect(mapStillReferenced(tasks, 'map-1', 'one')).toBe(true)
    expect(mapStillReferenced(tasks, 'map-1', 'two')).toBe(true)
    expect(mapStillReferenced(tasks.filter((task) => task.id !== 'two'), 'map-1', 'one')).toBe(false)
  })
})
