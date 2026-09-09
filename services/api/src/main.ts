import 'dotenv/config'
import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import multipart from '@fastify/multipart'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { ApiExceptionFilter } from './errors/api-exception.filter'
import { attachRequestId } from './request-context/request-id.interceptor'
import type { RequestWithContext } from './request-context/request-id.interceptor'
import { getMapUploadLimits } from './maps/map-upload-limits'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  )
  const consoleOrigin = process.env.CONSOLE_ORIGIN ?? 'http://127.0.0.1:5173'
  const agentOrigin = process.env.AGENT_ORIGIN ?? 'http://127.0.0.1:5174'
  const requestLogger = new Logger('Request')
  const requestStartedAt = new WeakMap<object, number>()
  const mapUploadLimits = getMapUploadLimits()

  await app.register(multipart, {
    limits: { files: 3, fields: 1, parts: 4, fieldSize: 512, fileSize: mapUploadLimits.pcdBytes },
  })

  app.getHttpAdapter().getInstance().addHook('onRequest', (request, response, done) => {
    attachRequestId(request, response)
    requestStartedAt.set(request, Date.now())
    done()
  })
  app.getHttpAdapter().getInstance().addHook('onResponse', (request, response, done) => {
    const requestId = (request as RequestWithContext).requestId
    requestLogger.log(JSON.stringify({
      requestId,
      method: request.method,
      url: request.url,
      status: response.statusCode,
      durationMs: Date.now() - (requestStartedAt.get(request) ?? Date.now()),
    }))
    done()
  })

  app.enableCors({ origin: [consoleOrigin, agentOrigin] })
  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
  app.useGlobalFilters(new ApiExceptionFilter())

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
