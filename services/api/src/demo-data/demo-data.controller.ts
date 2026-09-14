import { Controller, HttpCode, Inject, Post } from '@nestjs/common'
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { DemoDataService } from './demo-data.service'

@ApiTags('demo-data')
@Controller('demo')
export class DemoDataController {
  constructor(@Inject(DemoDataService) private readonly demoData: DemoDataService) {}

  @Post('reset')
  @HttpCode(204)
  @ApiOperation({ summary: '重置当前演示账号的数据' })
  @ApiNoContentResponse({ description: '已恢复默认演示地图、导览任务和系统人设。' })
  async reset() {
    await this.demoData.resetCurrentUser()
  }
}
