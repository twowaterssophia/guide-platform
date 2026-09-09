import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags('system')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: '检查 API 是否可用' })
  @ApiOkResponse({ description: 'API 正常运行。' })
  check() {
    return {
      status: 'ok' as const,
      service: 'guide-api' as const,
      timestamp: new Date().toISOString(),
    }
  }
}
