import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { LocalMapStorageProvider } from '../src/maps/map-storage.provider'

test('stores, reads, and removes a complete map bundle', async () => {
  const root = await mkdtemp(join(tmpdir(), 'guide-map-storage-'))
  const previousRoot = process.env.MAP_STORAGE_ROOT
  process.env.MAP_STORAGE_ROOT = root
  try {
    const provider = new LocalMapStorageProvider()
    const stored = await provider.save('map_test', Buffer.from('pcd'), Buffer.from('png'))
    assert.equal(await provider.read(stored.pcdStorageKey).then((value) => value.toString()), 'pcd')
    assert.equal(await readFile(join(root, stored.previewStorageKey)).then((value) => value.toString()), 'png')
    await provider.delete('map_test')
    await assert.rejects(readFile(join(root, stored.pcdStorageKey)))
  } finally {
    if (previousRoot === undefined) delete process.env.MAP_STORAGE_ROOT
    else process.env.MAP_STORAGE_ROOT = previousRoot
    await rm(root, { recursive: true, force: true })
  }
})
