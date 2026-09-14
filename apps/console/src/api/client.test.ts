import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError, deleteResource, getJson, postForm, postJson } from './client'

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
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/tour-tasks')
  })

  it('rejects a non-successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: vi.fn().mockResolvedValue({ code: 'RESOURCE_IN_USE', message: '地图正在使用' }),
    }))

    const error = await getJson('/tour-tasks').catch((reason: unknown) => reason)
    expect(error).toBeInstanceOf(ApiClientError)
    expect(error).toMatchObject({ status: 409, code: 'RESOURCE_IN_USE', message: '地图正在使用' })
  })

  it('sends JSON bodies for write requests', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({ id: 'persona-1' }),
    }))

    await expect(postJson('/personas', { name: '导览员' })).resolves.toEqual({ id: 'persona-1' })
    expect(fetch).toHaveBeenCalledWith('/api/v1/personas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":"导览员"}',
    })
  })

  it('accepts an empty successful delete response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }))

    await expect(deleteResource('/personas/persona-1')).resolves.toBeUndefined()
  })

  it('sends multipart bodies without overriding the browser content type', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({ id: 'map-1' }),
    }))
    const form = new FormData()
    form.append('name', '一层大厅')

    await expect(postForm('/maps', form)).resolves.toEqual({ id: 'map-1' })
    expect(fetch).toHaveBeenCalledWith('/api/v1/maps', { method: 'POST', body: form })
  })
})
