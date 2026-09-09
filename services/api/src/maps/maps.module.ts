import { Module } from '@nestjs/common'
import { LocalMapStorageProvider, MAP_STORAGE_PROVIDER, MapStorageService } from './map-storage.provider'
import { MapsController } from './maps.controller'
import { MapsService } from './maps.service'

@Module({
  controllers: [MapsController],
  providers: [
    LocalMapStorageProvider,
    MapStorageService,
    MapsService,
    { provide: MAP_STORAGE_PROVIDER, useExisting: LocalMapStorageProvider },
  ],
  exports: [MapStorageService],
})
export class MapsModule {}
