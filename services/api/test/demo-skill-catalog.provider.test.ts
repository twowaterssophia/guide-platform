import assert from 'node:assert/strict'
import test from 'node:test'
import { DemoSkillCatalogProvider } from '../src/skills/demo-skill-catalog.provider'

test('filters demo skills by source and compatibility', async () => {
  const provider = new DemoSkillCatalogProvider()
  const skills = await provider.list({ source: 'cloud', compatible: true })

  assert.ok(skills.length > 0)
  assert.ok(skills.every((skill) => skill.source === 'cloud' && skill.compatible))
})

test('returns a defensive array from the demo catalog', async () => {
  const provider = new DemoSkillCatalogProvider()
  const first = await provider.list({})
  first.pop()

  const second = await provider.list({})
  assert.equal(second.length, 4)
})
