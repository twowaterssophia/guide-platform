import { tourTaskDetailSchema, tourTaskListSchema } from '@guide/contracts'
import { deleteResource, getJson } from '../../api/client'

export const tourTasksQueryKey = ['tour-tasks'] as const

export async function listTourTasks() {
  return tourTaskListSchema.parse(await getJson('/tour-tasks'))
}

export async function getTourTask(taskId: string) {
  return tourTaskDetailSchema.parse(await getJson(`/tour-tasks/${taskId}`))
}

export async function deleteTourTask(taskId: string) {
  await deleteResource(`/tour-tasks/${taskId}`)
}
