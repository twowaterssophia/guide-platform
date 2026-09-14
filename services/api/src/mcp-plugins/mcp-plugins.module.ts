import { Module } from '@nestjs/common'
import { McpPluginsController } from './mcp-plugins.controller'
import { McpPluginsService } from './mcp-plugins.service'

@Module({ controllers: [McpPluginsController], providers: [McpPluginsService] })
export class McpPluginsModule {}
