import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query, Req, Res } from '@nestjs/common'
import { ApiConsumes, ApiCreatedResponse, ApiExtraModels, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { FastifyReply } from 'fastify'
import { ListMapsQuery, RenameMapDto } from './map.dto'
import { parseMapUploadRequest } from './map-upload.parser'
import type { MapMultipartRequest } from './map-upload.parser'
import { MapsService } from './maps.service'

@ApiTags('maps')
@ApiExtraModels(ListMapsQuery, RenameMapDto)
@Controller('maps')
export class MapsController {
  constructor(@Inject(MapsService) private readonly mapsService: MapsService) {}

  @Get()
  @ApiOperation({ summary: '列出当前账号的地图' })
  @ApiOkResponse({ description: '按创建时间倒序排列的地图摘要。' })
  list(@Query() query: ListMapsQuery) {
    return this.mapsService.list(query)
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传包含 PCD、PNG 和配准 JSON 的 ZIP 地图包' })
  @ApiCreatedResponse({ description: '上传后的地图详情。' })
  async create(@Req() request: MapMultipartRequest) {
    return this.mapsService.create(await parseMapUploadRequest(request))
  }

  @Get(':mapId/preview')
  @ApiOperation({ summary: '读取当前账号的二维地图预览' })
  async preview(@Param('mapId') mapId: string, @Res({ passthrough: true }) response: FastifyReply) {
    const preview = await this.mapsService.readPreview(mapId)
    response.type(preview.mediaType)
    response.header('Cache-Control', 'private, max-age=300')
    return preview.value
  }

  @Get(':mapId')
  @ApiOperation({ summary: '读取当前账号的地图详情' })
  @ApiOkResponse({ description: '地图文件、预览、配准和引用信息。' })
  get(@Param('mapId') mapId: string) {
    return this.mapsService.get(mapId)
  }

  @Patch(':mapId')
  @ApiOperation({ summary: '重命名当前账号的地图' })
  @ApiOkResponse({ description: '重命名后的地图详情。' })
  rename(@Param('mapId') mapId: string, @Body() input: RenameMapDto) {
    return this.mapsService.rename(mapId, input)
  }

  @Delete(':mapId')
  @HttpCode(204)
  @ApiOperation({ summary: '删除未被任务引用的地图' })
  @ApiNoContentResponse({ description: '删除成功。' })
  async delete(@Param('mapId') mapId: string) {
    await this.mapsService.delete(mapId)
  }
}
