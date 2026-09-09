import { afterEach, describe, expect, it, vi } from 'vitest'
import { deleteResource, getJson, postJson } from './client'

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

  it('sends JSON bodies for write requests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({ id: 'persona-1' }),
    }))

    await expect(postJson('/personas', { name: '导览员' })).resolves.toEqual({ id: 'persona-1' })
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:3000/api/v1/personas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"导览员"}',
    })
  })

  it('accepts an empty successful delete response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }))

    await expect(deleteResource('/personas/persona-1')).resolves.toBeUndefined()
  })
})
