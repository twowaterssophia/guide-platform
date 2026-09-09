import { Global, Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { CurrentUserService } from './current-user.service'

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [CurrentUserService],
  exports: [CurrentUserService],
})
export class IdentityModule {}
