import { Controller, Get, Inject } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { TourTasksService } from './tour-tasks.service'

@ApiTags('tour-tasks')
@Controller('tour-tasks')
export class TourTasksController {
  constructor(@Inject(TourTasksService) private readonly tourTasksService: TourTasksService) {}

  @Get()
  @ApiOperation({ summary: '列出当前账号的导览任务' })
  @ApiOkResponse({ description: '按创建时间倒序排列的导览任务摘要。' })
  list() {
    return this.tourTasksService.listForDemoUser()
  }
}
