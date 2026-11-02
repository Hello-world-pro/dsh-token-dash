/**
 * 生成市场图标 docs/pic/icon.png（512×512，深色 + 主蓝，与 Pill 同一套色）。
 * 用法：npm run icon
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'

const root = resolve('.')
const outDir = join(root, 'docs', 'pic')
const out = join(outDir, 'icon.png')
mkdirSync(outDir, { recursive: true })

function resolveChromium() {
  const fromEnv = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  if (typeof fromEnv === 'string' && fromEnv !== '' && existsSync(fromEnv)) return fromEnv
  try {
    const bundled = chromium.executablePath()
    if (existsSync(bundled)) return bundled
  } catch { /* fall through */ }
  const base = join(process.env.LOCALAPPDATA ?? '', 'ms-playwright')
  if (!existsSync(base)) return undefined
  return readdirSync(base)
    .filter((name) => /^chromium-\d+$/.test(name))
    .sort((left, right) => Number(right.split('-')[1]) - Number(left.split('-')[1]))
    .map((name) => join(base, name, 'chrome-win64', 'chrome.exe'))
    .find((candidate) => existsSync(candidate))
}

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: 256px; height: 256px; background: transparent; }
  .tile {
    position: relative; width: 256px; height: 256px; border-radius: 58px;
    background: radial-gradient(120% 120% at 18% 8%, #24304a 0%, #161b26 52%, #10141d 100%);
    box-shadow: inset 0 0 0 2px rgba(255,255,255,.07);
    overflow: hidden; display: flex; align-items: flex-end; justify-content: center;
    padding-bottom: 56px; box-sizing: border-box;
  }
  .grid {
    position: absolute; inset: 0; opacity: .5;
    background-image: radial-gradient(rgba(255,255,255,.09) 1.5px, transparent 1.5px);
    background-size: 22px 22px; background-position: 4px 6px;
  }
  .bars { position: relative; display: flex; align-items: flex-end; gap: 18px; }
  .bars i { display: block; width: 38px; border-radius: 10px; }
  .bars i:nth-child(1) { height: 58px;  background: rgba(110,168,255,.42); }
  .bars i:nth-child(2) { height: 96px;  background: rgba(110,168,255,.70); }
  .bars i:nth-child(3) { height: 134px; background: #6ea8ff; box-shadow: 0 0 26px rgba(110,168,255,.45); }
  .base {
    position: absolute; left: 44px; right: 44px; bottom: 44px; height: 3px; border-radius: 2px;
    background: linear-gradient(90deg, rgba(110,168,255,.15), rgba(110,168,255,.55), rgba(110,168,255,.15));
  }
  .coin {
    position: absolute; top: 40px; left: 44px; width: 44px; height: 44px; border-radius: 50%;
    border: 3px solid rgba(110,168,255,.55); display: flex; align-items: center; justify-content: center;
    color: #cfe2ff; font: 600 24px/1 ui-sans-serif, system-ui, "Segoe UI", sans-serif;
  }
</style></head><body>
  <div class="tile">
    <div class="grid"></div>
    <div class="coin">¥</div>
    <div class="bars"><i></i><i></i><i></i></div>
    <div class="base"></div>
  </div>
</body></html>`

const executablePath = resolveChromium()
const browser = await chromium.launch({ headless: true, ...(executablePath === undefined ? {} : { executablePath }) })
try {
  const page = await browser.newPage({ viewport: { width: 256, height: 256 }, deviceScaleFactor: 2 })
  await page.setContent(html, { waitUntil: 'load' })
  await page.waitForTimeout(200)
  await page.screenshot({ path: out, omitBackground: true })
  console.log(`[icon] ${out}`)
} finally {
  await browser.close().catch(() => {})
}
