import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  )
  const consoleOrigin = process.env.CONSOLE_ORIGIN ?? 'http://127.0.0.1:5173'
  const agentOrigin = process.env.AGENT_ORIGIN ?? 'http://127.0.0.1:5174'

  app.enableCors({ origin: [consoleOrigin, agentOrigin] })
  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))

  const config = new DocumentBuilder()
    .setTitle('Guide Platform API')
    .setDescription('导览后台与导览 Agent 的本地 API 合约。')
    .setVersion('0.1.0')
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api-docs', app, document)

  await app.listen(Number(process.env.API_PORT ?? 3000), '127.0.0.1')
}

void bootstrap()
