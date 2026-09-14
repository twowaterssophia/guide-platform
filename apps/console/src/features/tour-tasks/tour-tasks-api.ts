import { tourTaskDetailSchema, tourTaskListSchema } from '@guide/contracts'
import type { TourTaskUpdateInput, TourTaskWriteInput } from '@guide/contracts'
import { deleteResource, getJson, patchJson, postJson } from '../../api/client'

export const tourTasksQueryKey = ['tour-tasks'] as const

export async function listTourTasks() {
  return tourTaskListSchema.parse(await getJson('/tour-tasks'))
}

export async function getTourTask(taskId: string) {
  return tourTaskDetailSchema.parse(await getJson(`/tour-tasks/${taskId}`))
}

export async function createTourTask(input: TourTaskWriteInput) {
  return tourTaskDetailSchema.parse(await postJson('/tour-tasks', input))
}

export async function updateTourTask(taskId: string, input: TourTaskUpdateInput) {
  return tourTaskDetailSchema.parse(await patchJson(`/tour-tasks/${taskId}`, input))
}

export async function deleteTourTask(taskId: string) {
  await deleteResource(`/tour-tasks/${taskId}`)
}
