import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { LegacyMigrationService } from './legacy-migration.service'
import type { LegacyMigrationMapBindings } from './legacy-migration.types'

function usage(): never {
  console.error('用法：pnpm --filter @guide/api migration:legacy -- --file <导出 JSON> [--dry-run] [--apply] [--map <旧地图 ID>=<新版地图 ID>]')
  process.exit(2)
}

function parseArgs(argv: string[]) {
  let file = ''
  let apply = false
  const mapBindings: LegacyMigrationMapBindings = {}
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--') continue
    if (arg === '--file') file = argv[++index] ?? ''
    else if (arg === '--apply') apply = true
    else if (arg === '--dry-run') apply = false
    else if (arg === '--map') {
      const value = argv[++index] ?? ''
      const separator = value.indexOf('=')
      if (separator <= 0 || separator === value.length - 1) usage()
      mapBindings[value.slice(0, separator)] = value.slice(separator + 1)
    } else usage()
  }
  if (!file) usage()
  return { file, apply, mapBindings }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const raw = JSON.parse(await readFile(args.file, 'utf8')) as unknown
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false })
  try {
    const service = app.get(LegacyMigrationService)
    const report = await service.dryRun(raw, { mapBindings: args.mapBindings })
    console.log(JSON.stringify(report, null, 2))
    if (!args.apply || !report.ready) {
      if (args.apply && !report.ready) process.exitCode = 1
      return
    }
    const result = await service.importLegacy(raw, { mapBindings: args.mapBindings })
    console.log(JSON.stringify({ imported: result }, null, 2))
  } finally {
    await app.close()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
