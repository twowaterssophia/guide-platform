import assert from 'node:assert/strict'
import test from 'node:test'
import { personaWriteInputSchema } from '@guide/contracts'

test('accepts the supported persona settings without custom skills', () => {
  const result = personaWriteInputSchema.safeParse({
    name: '展厅讲解员',
    voice: 'female',
    prompt: '使用清晰、友好的语气回答问题。',
    presetSkillsEnabled: true,
    pluginIds: ['plugin-knowledge-base'],
  })

  assert.equal(result.success, true)
})
