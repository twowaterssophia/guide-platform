import { Module } from '@nestjs/common'
import { SkillsModule } from '../skills/skills.module'
import { PersonasController } from './personas.controller'
import { PersonasService } from './personas.service'

@Module({
  imports: [SkillsModule],
  controllers: [PersonasController],
  providers: [PersonasService],
})
export class PersonasModule {}
