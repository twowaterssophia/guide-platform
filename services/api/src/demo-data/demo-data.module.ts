import { Module } from '@nestjs/common'
import { MapsModule } from '../maps/maps.module'
import { DemoDataController } from './demo-data.controller'
import { DemoDataService } from './demo-data.service'

@Module({
  imports: [MapsModule],
  controllers: [DemoDataController],
  providers: [DemoDataService],
})
export class DemoDataModule {}
