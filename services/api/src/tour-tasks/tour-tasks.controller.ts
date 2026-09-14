import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post } from '@nestjs/common'
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { TourTasksService } from './tour-tasks.service'

@ApiTags('tour-tasks')
@Controller('tour-tasks')
export class TourTasksController {
  constructor(@Inject(TourTasksService) private readonly tourTasksService: TourTasksService) {}

  @Get()
  @ApiOperation({ summary: '列出当前账号的导览任务' })
  @ApiOkResponse({ description: '按创建时间倒序排列的导览任务摘要。' })
  list() {
    return this.tourTasksService.listForCurrentUser()
  }

  @Post()
  @ApiOperation({ summary: '创建导览任务' })
  @ApiCreatedResponse({ description: '创建后的导览任务详情。' })
  create(@Body() input: unknown) {
    return this.tourTasksService.create(input)
  }

  @Get(':taskId')
  @ApiOperation({ summary: '获取导览任务详情' })
  @ApiOkResponse({ description: '包含地图、人设、点位、路径和动作。' })
  get(@Param('taskId') taskId: string) {
    return this.tourTasksService.get(taskId)
  }

  @Patch(':taskId')
  @ApiOperation({ summary: '更新导览任务' })
  @ApiOkResponse({ description: '更新后的导览任务详情。' })
  update(@Param('taskId') taskId: string, @Body() input: unknown) {
    return this.tourTasksService.update(taskId, input)
  }

  @Delete(':taskId')
  @HttpCode(204)
  @ApiOperation({ summary: '删除导览任务' })
  @ApiNoContentResponse({ description: '删除成功。' })
  async delete(@Param('taskId') taskId: string) {
    await this.tourTasksService.delete(taskId)
  }
}
