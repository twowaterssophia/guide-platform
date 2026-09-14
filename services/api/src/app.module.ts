import { Module } from '@nestjs/common'
import { DatabaseModule } from './database/database.module'
import { DemoDataModule } from './demo-data/demo-data.module'
import { HealthController } from './health/health.controller'
import { IdentityModule } from './identity/identity.module'
import { LegacyMigrationModule } from './legacy-migration/legacy-migration.module'
import { AgentModule } from './agent/agent.module'
import { MapsModule } from './maps/maps.module'
import { McpPluginsModule } from './mcp-plugins/mcp-plugins.module'
import { PersonasModule } from './personas/personas.module'
import { SkillsModule } from './skills/skills.module'
import { TourTasksController } from './tour-tasks/tour-tasks.controller'
import { TourTasksService } from './tour-tasks/tour-tasks.service'

@Module({
  imports: [DatabaseModule, IdentityModule, SkillsModule, PersonasModule, MapsModule, McpPluginsModule, LegacyMigrationModule, AgentModule, DemoDataModule],
  controllers: [HealthController, TourTasksController],
  providers: [TourTasksService],
})
export class AppModule {}
