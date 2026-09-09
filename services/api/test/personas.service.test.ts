import assert from 'node:assert/strict'
import test from 'node:test'
import { BadRequestException } from '@nestjs/common'
import { DemoSkillCatalogProvider } from '../src/skills/demo-skill-catalog.provider'
import { resolveCustomSkillCreates } from '../src/personas/personas.service'

test('resolves custom skill names and sources from the catalog', async () => {
  const result = await resolveCustomSkillCreates([{
    skillId: 'official-handshake',
    instruction: '  greet visitors  ',
    example: '  hello  ',
  }], new DemoSkillCatalogProvider())

  assert.deepEqual(result, [{
    skillId: 'official-handshake',
    skillName: '握手',
    source: 'OFFICIAL',
    instruction: 'greet visitors',
    example: 'hello',
    sequence: 0,
  }])
})

test('rejects unavailable custom skills', async () => {
  await assert.rejects(
    resolveCustomSkillCreates([{
      skillId: 'missing-skill',
      instruction: 'use it',
      example: 'example',
    }], new DemoSkillCatalogProvider()),
    BadRequestException,
  )
})
