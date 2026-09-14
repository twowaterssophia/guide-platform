import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post } from '@nestjs/common'
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { McpPluginsService } from './mcp-plugins.service'

@ApiTags('mcp-plugins')
@Controller('mcp-plugins')
export class McpPluginsController {
  constructor(@Inject(McpPluginsService) private readonly plugins: McpPluginsService) {}

  @Get()
  @ApiOperation({ summary: '列出当前账号的 MCP 插件' })
  list() { return this.plugins.list() }

  @Post()
  @ApiCreatedResponse({ description: '创建后的插件详情；响应不包含认证密钥。' })
  create(@Body() input: unknown) { return this.plugins.create(input) }

  @Get(':pluginId')
  @ApiOkResponse({ description: '插件详情；响应不包含认证密钥。' })
  get(@Param('pluginId') pluginId: string) { return this.plugins.get(pluginId) }

  @Patch(':pluginId')
  update(@Param('pluginId') pluginId: string, @Body() input: unknown) { return this.plugins.update(pluginId, input) }

  @Post(':pluginId/refresh-tools')
  @HttpCode(200)
  @ApiOperation({ summary: '刷新插件工具列表' })
  refresh(@Param('pluginId') pluginId: string) { return this.plugins.refresh(pluginId) }

  @Delete(':pluginId')
  @HttpCode(204)
  @ApiNoContentResponse({ description: '删除插件并解除人设关联。' })
  async delete(@Param('pluginId') pluginId: string) { await this.plugins.delete(pluginId) }
}
