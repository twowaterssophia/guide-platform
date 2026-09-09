import { Module } from '@nestjs/common'
import { LegacyMigrationService } from './legacy-migration.service'

@Module({
  providers: [LegacyMigrationService],
  exports: [LegacyMigrationService],
})
export class LegacyMigrationModule {}
