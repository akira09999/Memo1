import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawnSync } from 'child_process'

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const resourcesDir = path.join(rootDir, 'resources')
const sourcePng = path.join(resourcesDir, 'icon.png')
const targetIcns = path.join(resourcesDir, 'icon.icns')

if (!fs.existsSync(sourcePng)) {
  throw new Error(`Source icon not found: ${sourcePng}`)
}

if (process.platform !== 'darwin') {
  console.log('Skipping mac icon generation because the current platform is not macOS.')
  process.exit(0)
}

const iconsetDir = path.join(os.tmpdir(), `memoapp-icon-${Date.now()}.iconset`)
fs.mkdirSync(iconsetDir, { recursive: true })

const iconSizes = [
  16,
  32,
  64,
  128,
  256,
  512
]

for (const size of iconSizes) {
  const baseName = `icon_${size}x${size}.png`
  const retinaName = `icon_${size}x${size}@2x.png`

  const resize = spawnSync('sips', ['-z', String(size), String(size), sourcePng, '--out', path.join(iconsetDir, baseName)], {
    stdio: 'inherit'
  })
  if (resize.status !== 0) {
    throw new Error(`sips failed while generating ${baseName}`)
  }

  const retinaSize = size * 2
  const retinaResize = spawnSync('sips', ['-z', String(retinaSize), String(retinaSize), sourcePng, '--out', path.join(iconsetDir, retinaName)], {
    stdio: 'inherit'
  })
  if (retinaResize.status !== 0) {
    throw new Error(`sips failed while generating ${retinaName}`)
  }
}

const iconutil = spawnSync('iconutil', ['-c', 'icns', iconsetDir, '-o', targetIcns], {
  stdio: 'inherit'
})

if (iconutil.status !== 0) {
  throw new Error('iconutil failed while generating icon.icns')
}

fs.rmSync(iconsetDir, { recursive: true, force: true })
console.log(`Generated macOS icon: ${targetIcns}`)
