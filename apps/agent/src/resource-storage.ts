import type { AgentTaskPackage } from '@guide/contracts'

const databaseName = 'guide-agent-resources'
const databaseVersion = 1

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains('tasks')) database.createObjectStore('tasks', { keyPath: 'task.id' })
      if (!database.objectStoreNames.contains('maps')) database.createObjectStore('maps', { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function completed(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export async function saveTaskPackage(resource: AgentTaskPackage) {
  const database = await openDatabase()
  const transaction = database.transaction(['tasks', 'maps'], 'readwrite')
  transaction.objectStore('tasks').put(resource)
  transaction.objectStore('maps').put(resource.map)
  await completed(transaction)
  database.close()
}

export async function deleteTaskPackage(taskId: string, mapId: string | null, mapStillReferenced: boolean) {
  const database = await openDatabase()
  const transaction = database.transaction(['tasks', 'maps'], 'readwrite')
  transaction.objectStore('tasks').delete(taskId)
  if (mapId && !mapStillReferenced) transaction.objectStore('maps').delete(mapId)
  await completed(transaction)
  database.close()
}
