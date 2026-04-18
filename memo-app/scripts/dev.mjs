/**
 * electron-vite dev 래퍼
 * ELECTRON_RUN_AS_NODE 환경변수를 삭제 후 electron-vite를 실행한다.
 * (이 변수가 설정된 상태에서는 Electron이 Node.js 모드로 동작해 app API를 사용할 수 없음)
 */
import { spawn } from 'child_process'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// ELECTRON_RUN_AS_NODE 제거
const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const eviteBin = resolve(__dirname, '../node_modules/.bin/electron-vite')
const args = process.argv.slice(2)

const ps = spawn(eviteBin, ['dev', ...args], {
  env,
  stdio: 'inherit',
  shell: true
})

ps.on('close', (code) => process.exit(code ?? 0))
