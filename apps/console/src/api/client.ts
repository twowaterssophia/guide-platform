const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000/api/v1'

export async function getJson(path: string) {
  const response = await fetch(`${apiBaseUrl}${path}`)
  if (!response.ok) throw new Error(`请求失败（${response.status}）`)
  return response.json() as Promise<unknown>
}
