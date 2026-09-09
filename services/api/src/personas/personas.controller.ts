import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiCreatedResponse, ApiExtraModels, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ListPersonasQuery, PersonaCustomSkillInputDto, PersonaUpdateDto, PersonaWriteDto } from './persona.dto'
import { PersonasService } from './personas.service'

@ApiTags('personas')
@ApiExtraModels(ListPersonasQuery, PersonaCustomSkillInputDto, PersonaWriteDto, PersonaUpdateDto)
@Controller('personas')
export class PersonasController {
  constructor(@Inject(PersonasService) private readonly personasService: PersonasService) {}

  @Get()
  @ApiOperation({ summary: '列出当前账号可见的人设' })
  @ApiOkResponse({ description: '系统默认人设和当前账号人设。' })
  list(@Query() query: ListPersonasQuery) {
    return this.personasService.list(query)
  }

  @Post()
  @ApiOperation({ summary: '创建人设' })
  @ApiCreatedResponse({ description: '创建后的人设详情。' })
  create(@Body() input: PersonaWriteDto) {
    return this.personasService.create(input)
  }

  @Get(':personaId')
  @ApiOperation({ summary: '获取人设详情' })
  @ApiOkResponse({ description: '当前账号可见的人设详情。' })
  get(@Param('personaId') personaId: string) {
    return this.personasService.get(personaId)
  }

  @Patch(':personaId')
  @ApiOperation({ summary: '更新当前账号的人设' })
  @ApiOkResponse({ description: '更新后的人设详情。' })
  update(@Param('personaId') personaId: string, @Body() input: PersonaUpdateDto) {
    return this.personasService.update(personaId, input)
  }

  @Delete(':personaId')
  @HttpCode(204)
  @ApiOperation({ summary: '删除当前账号的人设' })
  @ApiNoContentResponse({ description: '删除成功；引用任务回退到系统默认人设。' })
  async delete(@Param('personaId') personaId: string) {
    await this.personasService.delete(personaId)
  }
}
