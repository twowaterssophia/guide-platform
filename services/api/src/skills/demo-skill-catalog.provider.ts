import { Injectable } from '@nestjs/common'
import type { SkillList } from '@guide/contracts'
import type { SkillCatalogProvider, SkillCatalogQuery } from './skill-catalog.provider'

const demoSkills: SkillList = [
  { id: 'official-greeting', name: '打招呼', source: 'official', version: '1.0.0', compatible: true },
  { id: 'official-handshake', name: '握手', source: 'official', version: '1.0.0', compatible: true },
  { id: 'cloud-turn-head', name: '转动头部', source: 'cloud', version: '2.1.0', compatible: true },
  { id: 'cloud-wave-legacy', name: '挥手（旧版）', source: 'cloud', version: '0.8.0', compatible: false },
]

@Injectable()
export class DemoSkillCatalogProvider implements SkillCatalogProvider {
  async list(query: SkillCatalogQuery): Promise<SkillList> {
    return demoSkills.filter((skill) => {
      if (query.source && skill.source !== query.source) return false
      if (query.compatible !== undefined && skill.compatible !== query.compatible) return false
      return true
    })
  }
}
