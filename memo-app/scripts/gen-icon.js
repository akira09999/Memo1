/**
 * 메모앱 아이콘 생성 스크립트
 * pngjs를 사용해 256x256 PNG를 생성합니다.
 */
const { PNG } = require('C:/Work/png2ico-cli/node_modules/pngjs/lib/png.js')
const fs = require('fs')
const path = require('path')

const SIZE = 256

function lerp(a, b, t) { return a + (b - a) * t }

function setPixel(png, x, y, r, g, b, a = 255) {
  const idx = (SIZE * y + x) * 4
  png.data[idx]     = r
  png.data[idx + 1] = g
  png.data[idx + 2] = b
  png.data[idx + 3] = a
}

function distToRect(x, y, rx, ry, rw, rh) {
  const dx = Math.max(rx - x, 0, x - (rx + rw))
  const dy = Math.max(ry - y, 0, y - (ry + rh))
  return Math.sqrt(dx * dx + dy * dy)
}

function drawRoundRect(png, x, y, w, h, r, fr, fg, fb, fa = 255) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      // 코너 라운딩
      let inCorner = false
      let alpha = fa
      const corners = [
        [x + r, y + r],
        [x + w - r, y + r],
        [x + r, y + h - r],
        [x + w - r, y + h - r]
      ]
      if (
        (px < x + r && py < y + r) ||
        (px > x + w - r && py < y + r) ||
        (px < x + r && py > y + h - r) ||
        (px > x + w - r && py > y + h - r)
      ) {
        inCorner = true
        const cx = px < x + r ? x + r : x + w - r
        const cy = py < y + r ? y + r : y + h - r
        const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2)
        if (dist > r + 0.5) { alpha = 0 }
        else if (dist > r - 0.5) { alpha = Math.round(fa * (r + 0.5 - dist)) }
      }
      if (alpha > 0) {
        setPixel(png, px, py, fr, fg, fb, alpha)
      }
    }
  }
}

function drawLine(png, x1, y1, x2, y2, thick, r, g, b) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 4
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const px = lerp(x1, x2, t)
    const py = lerp(y1, y2, t)
    for (let dy = -thick; dy <= thick; dy++) {
      for (let dx = -thick; dx <= thick; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d <= thick) {
          const nx = Math.round(px + dx)
          const ny = Math.round(py + dy)
          if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE) {
            const alpha = d > thick - 0.5 ? Math.round(255 * (thick - d + 0.5)) : 255
            const idx = (SIZE * ny + nx) * 4
            // 항상 덮어쓰기 (노트 카드 위에도 그림)
            png.data[idx]     = r
            png.data[idx + 1] = g
            png.data[idx + 2] = b
            png.data[idx + 3] = Math.max(png.data[idx + 3], alpha)
          }
        }
      }
    }
  }
}

const png = new PNG({ width: SIZE, height: SIZE, filterType: -1 })

// 배경: 투명
png.data.fill(0)

// 배경 카드: 둥근 사각형 (인디고 → 보라 그라디언트)
const cardX = 24, cardY = 24, cardW = 208, cardH = 208, cardR = 40
for (let y = cardY; y < cardY + cardH; y++) {
  for (let x = cardX; x < cardX + cardW; x++) {
    const t = (y - cardY) / cardH
    const s = (x - cardX) / cardW

    // 파란(37,99,235) → 하늘(56,189,248) 그라디언트
    const r = Math.round(lerp(37, 56, t * 0.6 + s * 0.4))
    const g = Math.round(lerp(99, 189, t * 0.6 + s * 0.4))
    const b = Math.round(lerp(235, 248, t * 0.6 + s * 0.4))

    let alpha = 255

    // 코너 라운딩
    if (
      (x < cardX + cardR && y < cardY + cardR) ||
      (x > cardX + cardW - cardR && y < cardY + cardR) ||
      (x < cardX + cardR && y > cardY + cardH - cardR) ||
      (x > cardX + cardW - cardR && y > cardY + cardH - cardR)
    ) {
      const cx = x < cardX + cardR ? cardX + cardR : cardX + cardW - cardR
      const cy = y < cardY + cardR ? cardY + cardR : cardY + cardH - cardR
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      if (dist > cardR + 0.5) { alpha = 0 }
      else if (dist > cardR - 0.5) { alpha = Math.round(255 * (cardR + 0.5 - dist)) }
    }

    if (alpha > 0) {
      setPixel(png, x, y, r, g, b, alpha)
    }
  }
}

// 메모지 흰 카드
const noteX = 56, noteY = 60, noteW = 144, noteH = 136, noteR = 14
for (let y = noteY; y < noteY + noteH; y++) {
  for (let x = noteX; x < noteX + noteW; x++) {
    let alpha = 255

    if (
      (x < noteX + noteR && y < noteY + noteR) ||
      (x > noteX + noteW - noteR && y < noteY + noteR) ||
      (x < noteX + noteR && y > noteY + noteH - noteR) ||
      (x > noteX + noteW - noteR && y > noteY + noteH - noteR)
    ) {
      const cx = x < noteX + noteR ? noteX + noteR : noteX + noteW - noteR
      const cy = y < noteY + noteR ? noteY + noteR : noteY + noteH - noteR
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      if (dist > noteR + 0.5) { alpha = 0 }
      else if (dist > noteR - 0.5) { alpha = Math.round(255 * (noteR + 0.5 - dist)) }
    }

    if (alpha > 0) {
      setPixel(png, x, y, 255, 255, 255, alpha)
    }
  }
}

// 텍스트 라인 (메모 내용처럼 보이는 가로 선)
const lineColor = [120, 170, 220]  // 파란-하늘
const lines = [
  { x: 76, y: 96,  w: 104 },
  { x: 76, y: 116, w: 86 },
  { x: 76, y: 136, w: 96 },
  { x: 76, y: 156, w: 70 },
]
for (const line of lines) {
  drawLine(png, line.x, line.y, line.x + line.w, line.y, 3.5, ...lineColor)
}


// 저장
const outDir = path.join(__dirname, '..', 'resources')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
const pngPath = path.join(outDir, 'icon.png')
const icoPath = path.join(outDir, 'icon.ico')

const pngBuffer = PNG.sync.write(png)
fs.writeFileSync(pngPath, pngBuffer)
console.log('PNG generated:', pngPath)

// ICO 생성 (256x256 포함)
// ICO 포맷: 256 크기는 uint8 필드에 0으로 저장
const sizes = [16, 32, 48, 64, 128, 256]
const imageCount = sizes.length
const headerSize = 6 + imageCount * 16
let offset = headerSize
const entries = sizes.map(size => {
  const entry = { size, offset, dataSize: pngBuffer.length }
  offset += pngBuffer.length
  return entry
})

const icoBuffer = Buffer.alloc(headerSize + pngBuffer.length * imageCount)
icoBuffer.writeUInt16LE(0, 0)           // reserved
icoBuffer.writeUInt16LE(1, 2)           // type = icon
icoBuffer.writeUInt16LE(imageCount, 4)  // count

entries.forEach((entry, i) => {
  const base = 6 + i * 16
  icoBuffer.writeUInt8(entry.size >= 256 ? 0 : entry.size, base)     // width (0 = 256)
  icoBuffer.writeUInt8(entry.size >= 256 ? 0 : entry.size, base + 1) // height
  icoBuffer.writeUInt8(0, base + 2)      // color count
  icoBuffer.writeUInt8(0, base + 3)      // reserved
  icoBuffer.writeUInt16LE(1, base + 4)   // planes
  icoBuffer.writeUInt16LE(32, base + 6)  // bit depth
  icoBuffer.writeUInt32LE(entry.dataSize, base + 8)   // data size
  icoBuffer.writeUInt32LE(entry.offset, base + 12)    // offset
  pngBuffer.copy(icoBuffer, entry.offset)
})

fs.writeFileSync(icoPath, icoBuffer)
console.log('ICO generated:', icoPath)
