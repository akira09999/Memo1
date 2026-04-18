/**
 * 트레이 아이콘 생성 (32x32)
 * 256x256 소스 PNG를 다운샘플링해서 tray-icon.png 생성
 */
const { PNG } = require('C:/Work/png2ico-cli/node_modules/pngjs/lib/png.js')
const fs = require('fs')
const path = require('path')

const srcPath = path.join(__dirname, '..', 'resources', 'icon.png')
const outPath = path.join(__dirname, '..', 'resources', 'tray-icon.png')

const srcBuf = fs.readFileSync(srcPath)
const src = PNG.sync.read(srcBuf)
const srcSize = src.width  // 256

const dstSize = 32
const dst = new PNG({ width: dstSize, height: dstSize, filterType: -1 })
dst.data.fill(0)

// 평균 다운샘플링 (box filter)
const scale = srcSize / dstSize
for (let dy = 0; dy < dstSize; dy++) {
  for (let dx = 0; dx < dstSize; dx++) {
    let r = 0, g = 0, b = 0, a = 0, count = 0
    const x0 = Math.floor(dx * scale)
    const x1 = Math.floor((dx + 1) * scale)
    const y0 = Math.floor(dy * scale)
    const y1 = Math.floor((dy + 1) * scale)
    for (let sy = y0; sy < y1; sy++) {
      for (let sx = x0; sx < x1; sx++) {
        const idx = (srcSize * sy + sx) * 4
        r += src.data[idx]
        g += src.data[idx + 1]
        b += src.data[idx + 2]
        a += src.data[idx + 3]
        count++
      }
    }
    if (count > 0) {
      const di = (dstSize * dy + dx) * 4
      dst.data[di]     = Math.round(r / count)
      dst.data[di + 1] = Math.round(g / count)
      dst.data[di + 2] = Math.round(b / count)
      dst.data[di + 3] = Math.round(a / count)
    }
  }
}

fs.writeFileSync(outPath, PNG.sync.write(dst))
console.log('Tray icon generated:', outPath)
