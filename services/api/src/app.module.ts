import { Module } from '@nestjs/common'
import { DatabaseModule } from './database/database.module'
import { HealthController } from './health/health.controller'
import { IdentityModule } from './identity/identity.module'
import { LegacyMigrationModule } from './legacy-migration/legacy-migration.module'
import { AgentModule } from './agent/agent.module'
import { MapsModule } from './maps/maps.module'
import { PersonasModule } from './personas/personas.module'
import { RuntimeController } from './runtime/runtime.controller'
import { RuntimeService } from './runtime/runtime.service'
import { SkillsModule } from './skills/skills.module'
import { TourTasksController } from './tour-tasks/tour-tasks.controller'
import { TourTasksService } from './tour-tasks/tour-tasks.service'

@Module({
  imports: [DatabaseModule, IdentityModule, SkillsModule, PersonasModule, MapsModule, LegacyMigrationModule, AgentModule],
  controllers: [HealthController, RuntimeController, TourTasksController],
  providers: [RuntimeService, TourTasksService],
})
export class AppModule {}
