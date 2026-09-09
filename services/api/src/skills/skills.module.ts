import { Module } from '@nestjs/common'
import { DemoSkillCatalogProvider } from './demo-skill-catalog.provider'
import { SKILL_CATALOG_PROVIDER } from './skill-catalog.provider'
import { SkillsController } from './skills.controller'
import { SkillsService } from './skills.service'

@Module({
  controllers: [SkillsController],
  providers: [
    DemoSkillCatalogProvider,
    SkillsService,
    { provide: SKILL_CATALOG_PROVIDER, useExisting: DemoSkillCatalogProvider },
  ],
  exports: [SKILL_CATALOG_PROVIDER],
})
export class SkillsModule {}
