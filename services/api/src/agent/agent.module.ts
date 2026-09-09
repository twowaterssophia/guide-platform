import { Module } from '@nestjs/common'
import { IdentityModule } from '../identity/identity.module'
import { MapsModule } from '../maps/maps.module'
import { AgentController } from './agent.controller'
import { AgentService } from './agent.service'

@Module({
  imports: [IdentityModule, MapsModule],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
