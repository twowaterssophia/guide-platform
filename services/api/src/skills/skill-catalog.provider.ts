import type { SkillList, SkillSource } from '@guide/contracts'

export interface SkillCatalogQuery {
  source?: SkillSource
  compatible?: boolean
}

export interface SkillCatalogProvider {
  list(query: SkillCatalogQuery): Promise<SkillList>
}

export const SKILL_CATALOG_PROVIDER = Symbol('SKILL_CATALOG_PROVIDER')
