import { postJson } from '../api/client'

export function resetDemoData() {
  return postJson('/demo/reset', {})
}
