import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiExtraModels, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ListSkillsQuery } from './list-skills.query'
import { SkillsService } from './skills.service'

@ApiTags('skills')
@ApiExtraModels(ListSkillsQuery)
@Controller('skills')
export class SkillsController {
  constructor(@Inject(SkillsService) private readonly skillsService: SkillsService) {}

  @Get()
  @ApiOperation({ summary: '列出当前运行模式可用的技能' })
  @ApiOkResponse({ description: '可按来源和当前设备兼容性过滤的技能摘要。' })
  list(@Query() query: ListSkillsQuery) {
    return this.skillsService.list(query)
  }
}
