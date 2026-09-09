import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveRequestId } from '../src/request-context/request-id.interceptor'

test('keeps a valid client-provided request ID', () => {
  assert.equal(resolveRequestId('request-123.trace'), 'request-123.trace')
})

test('replaces an invalid client-provided request ID', () => {
  const requestId = resolveRequestId('contains spaces')

  assert.match(requestId, /^[0-9a-f-]{36}$/i)
})
