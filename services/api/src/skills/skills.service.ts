import { Inject, Injectable } from '@nestjs/common'
import type { SkillList } from '@guide/contracts'
import type { ListSkillsQuery } from './list-skills.query'
import { SKILL_CATALOG_PROVIDER } from './skill-catalog.provider'
import type { SkillCatalogProvider } from './skill-catalog.provider'

@Injectable()
export class SkillsService {
  constructor(
    @Inject(SKILL_CATALOG_PROVIDER) private readonly catalog: SkillCatalogProvider,
  ) {}

  list(query: ListSkillsQuery): Promise<SkillList> {
    return this.catalog.list({
      source: query.source,
      compatible: query.compatible === undefined ? undefined : query.compatible === 'true',
    })
  }
}
