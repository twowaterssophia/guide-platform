import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDirectory = resolve(packageRoot, 'src')
const outputDirectory = resolve(packageRoot, 'dist')
const styleFiles = [
  'styles.css',
  'tokens.css',
  'button.css',
  'table.css',
  'tag.css',
  'empty-state.css',
  'popover.css',
  'modal.css',
  'toast.css',
]

await mkdir(outputDirectory, { recursive: true })
await Promise.all(styleFiles.map((fileName) => copyFile(
  resolve(sourceDirectory, fileName),
  resolve(outputDirectory, fileName),
)))
