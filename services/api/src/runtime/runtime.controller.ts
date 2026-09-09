import { Controller, Get, Inject } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { RuntimeService } from './runtime.service'

@ApiTags('system')
@Controller('runtime')
export class RuntimeController {
  constructor(@Inject(RuntimeService) private readonly runtimeService: RuntimeService) {}

  @Get()
  @ApiOperation({ summary: '读取当前外部 Provider 的运行模式' })
  @ApiOkResponse({ description: '外部 Provider 运行配置。' })
  getInfo() {
    return this.runtimeService.getInfo()
  }
}
