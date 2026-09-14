import { describe, expect, it } from 'vitest'
import type { TourTaskDetail } from '@guide/contracts'
import { detailToDraft, draftToInput } from './new-task-page'

const legacyTask: TourTaskDetail = {
  id: 'legacy-task',
  name: '历史任务',
  map: { id: 'map-1', name: '演示地图' },
  persona: null,
  version: 1,
  points: [
    { id: 'point-1', sequence: 1, name: '入口', x: 10, y: 20, angle: 0, actions: [] },
    { id: 'point-2', sequence: 2, name: '出口', x: 30, y: 40, angle: 180, actions: [] },
  ],
  paths: [],
  createdAt: '2026-09-11T00:00:00.000Z',
  updatedAt: '2026-09-11T00:00:00.000Z',
}

describe('legacy task path normalization', () => {
  it('hydrates one empty path for every adjacent point pair', () => {
    const draft = detailToDraft(legacyTask)

    expect(draft.paths).toEqual([{
      fromPointKey: 'point-point-1',
      toPointKey: 'point-point-2',
      actions: [],
    }])
  })

  it('normalizes paths again immediately before submitting', () => {
    const draft = detailToDraft(legacyTask)
    const input = draftToInput({ ...draft, paths: [] })

    expect(input.paths).toEqual([{
      fromPointKey: 'point-point-1',
      toPointKey: 'point-point-2',
      actions: [],
    }])
  })
})
