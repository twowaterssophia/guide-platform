import { afterEach, describe, expect, it, vi } from 'vitest'
import { getJson } from './client'

describe('getJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns parsed JSON for a successful response', async () => {
    const payload = [{ id: 'task-1' }]
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(payload),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(getJson('/tour-tasks')).resolves.toEqual(payload)
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:3000/api/v1/tour-tasks')
  })

  it('rejects a non-successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))

    await expect(getJson('/tour-tasks')).rejects.toThrow(/503/)
  })
})
