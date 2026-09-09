/* eslint-disable @typescript-eslint/consistent-type-imports */
import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common'
import { ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AgentDeviceInputDto, AgentDeviceQueryDto } from './agent.dto'
import { AgentService } from './agent.service'

@ApiTags('agent')
@Controller('agent/tasks')
export class AgentController {
  constructor(@Inject(AgentService) private readonly agentService: AgentService) {}

  @Get()
  @ApiOperation({ summary: '列出设备可用的已发布导览任务' })
  @ApiOkResponse({ description: '包含设备下载状态和发布版本。' })
  list(@Query() query: AgentDeviceQueryDto) {
    return this.agentService.list(query.deviceId)
  }

  @Post(':taskId/download')
  @HttpCode(200)
  @ApiOperation({ summary: '下载已发布导览任务包' })
  @ApiOkResponse({ description: '包含任务编排、地图 PCD、PNG 和配准元数据。' })
  download(@Param('taskId') taskId: string, @Body() input: AgentDeviceInputDto) {
    return this.agentService.download(taskId, input.deviceId)
  }

  @Delete(':taskId/download')
  @HttpCode(204)
  @ApiOperation({ summary: '删除设备上的导览任务下载记录' })
  @ApiNoContentResponse({ description: '删除成功。' })
  async remove(@Param('taskId') taskId: string, @Query() query: AgentDeviceQueryDto) {
    await this.agentService.remove(taskId, query.deviceId)
  }
}
