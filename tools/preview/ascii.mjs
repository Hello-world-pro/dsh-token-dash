/**
 * ASCII 草图生成器：按固定字符宽度画卡片 / 表格，保证边框对齐。
 *
 * 用法：
 *   npm run sketch          # 打印 P3 卡片示例（与 checklist §九 一致）
 *   或 import { box, rowOf, fit, right } from './tools/preview/ascii.mjs'
 *
 * 比例：页级草图 1 字符 ≈ 9.6px、1 行 ≈ 18px；卡宽由 spec.mjs 推导，
 * 因此改规格后草图宽度会自动跟着变，不用手调。
 *
 * 背景：Markdown 预览里 CJK 宽度不等于 2×ASCII，手写带左右边框的草图必然错位；
 * 用本脚本按字符数生成再贴进文档，就不会歪。
 */
import { SPEC, cardWidth, toChars } from './spec.mjs'

/** 按字符数右补空格（超出则截断），用于对齐卡片内容 */
export const fit = (text, width) => {
  const chars = [...text]
  return chars.slice(0, width).join('') + ' '.repeat(Math.max(0, width - chars.length))
}

/** 按字符数左补空格（右对齐） */
export const right = (text, width) => ' '.repeat(Math.max(0, width - [...text].length)) + text

/** 画一个宽 `width` 字符（含左右边框）的 ASCII 卡片 */
export const box = (width, lines) => {
  const inner = width - 2
  return [
    `+${'-'.repeat(inner)}+`,
    ...lines.map((line) => `|${fit(line, inner)}|`),
    `+${'-'.repeat(inner)}+`,
  ]
}

/** 把多张卡片横向拼成一行，空行用等宽空格补齐 */
export const rowOf = (cards, gap = ' ') => {
  const height = Math.max(...cards.map((card) => card.length))
  const padded = cards.map((card) => [...card, ...Array(height - card.length).fill('')])
  return Array.from({ length: height }, (_, index) => padded.map((card) => card[index] ?? '').join(gap))
}

// 页级宽度由规格推导：3 家 / 4 家两张一行
const API_CARD_CHARS = toChars(cardWidth(SPEC.layout.contentWidth, 3, SPEC.layout.gap))
const SUB_CARD_CHARS = toChars(cardWidth(SPEC.layout.contentWidth, 4, SPEC.layout.gap))
const SUB_INNER = SUB_CARD_CHARS - 2

/** 按量卡 */
const apiCard = (name, percent, used, plan, real, month) => box(API_CARD_CHARS, [
  ` ${name}`.padEnd(API_CARD_CHARS - 2 - 7) + '[PAYG]',
  '',
  '      (used)',
  `      ${percent}`,
  ` used  ${used}`,
  ` plan  ${plan}  edit`,
  ` real  ${real}`,
  ` month ${month}`,
])

/** 订阅卡：环心周期 + 环下百分比；窗口按实际数量等分，缺窗不出列 */
const subCard = (name, windows) => {
  const colWidth = Math.floor(SUB_INNER / windows.length)
  const line = (pick) => ` ${windows.map((win) => fit(pick(win), colWidth)).join('')}`
  return box(SUB_CARD_CHARS, [
    ` ${name}`.padEnd(SUB_INNER - 6) + '[SUB]',
    line((win) => `(${win.key})`),
    line((win) => win.percent),
    line((win) => win.left),
    line((win) => win.rel),
    line((win) => win.abs),
  ])
}

const apiRow = rowOf([
  apiCard('DeepSeek', '91.9%', 'CNY 91.90/100.00', 'CNY 8.10', 'CNY 87.66', 'CNY 91.90'),
  apiCard('OpenRouter', '38.0%', 'USD 19.00/50.00', 'USD 31.00', 'USD 7.66', 'USD 22.80'),
  apiCard('Qwen', '8.0%', 'CNY 0.40/5.00', 'CNY 4.60', '--', 'CNY 0.40'),
])

const subRow = rowOf([
  subCard('GLM Coding', [
    { key: '5h', percent: '43%', left: 'L58%', rel: '3h', abs: '22:51' },
    { key: 'week', percent: '18%', left: 'L82%', rel: '1d', abs: '11-05' },
    { key: 'mo', percent: '3%', left: 'L97%', rel: '18d', abs: '11-22' },
  ]),
  subCard('Kimi Coding', [
    { key: '5h', percent: '96%', left: 'L04%', rel: '10m', abs: '20:02' },
    { key: 'week', percent: '12%', left: 'L88%', rel: '1d', abs: '11-05' },
  ]),
  subCard('OpenCode Go', [
    { key: '5h', percent: '12%', left: 'L88%', rel: '2h', abs: '21:51' },
    { key: 'week', percent: '34%', left: 'L66%', rel: '4d', abs: '11-08' },
    { key: 'mo', percent: '58%', left: 'L42%', rel: '18d', abs: '11-22' },
  ]),
  subCard('Command Code', [
    { key: '5h', percent: '96%', left: 'L04%', rel: '1h', abs: '20:32' },
    { key: 'week', percent: '61%', left: 'L39%', rel: '5d', abs: '11-09' },
  ]),
])

// 单卡放大图沿用 2× 比例（1 字符 ≈ 4.8px）
const apiZoom = box(64, [
  ' DeepSeek'.padEnd(64 - 2 - 7) + '[PAYG]',
  '',
  '        (used)',
  '        91.9%',
  ' used   CNY 91.90 / 100.00',
  ' plan   CNY 8.10    edit',
  ' real   CNY 87.66',
  ' month  CNY 91.90',
])

const subZoom = box(48, [
  ' GLM Coding'.padEnd(48 - 2 - 6) + '[SUB]',
  '      (5h)         (week)        (mo)',
  '     42.5%         18.2%         3.0%',
  '     L58%          L82%          L97%',
  '     3h            1d            18d',
  '     22:51         11-05         11-22',
])

const main = () => {
  console.log('== 按量计价 · 3 家 → 一行 3 张 ==')
  console.log(apiRow.join('\n'))
  console.log('\n== 订阅套餐 · 4 家 → 一行 4 张 ==')
  console.log(subRow.join('\n'))
  console.log('\n== 单卡放大：按量 309 × 220 ==')
  console.log(apiZoom.join('\n'))
  console.log('\n== 单卡放大：订阅 229 × 175（三窗） ==')
  console.log(subZoom.join('\n'))
  console.log('')
  console.log('== 尺寸换算（P3 中栏 1000px，padding 24×2） ==')
  for (const viewport of [1000, 760, 520]) {
    const content = viewport - SPEC.layout.pagePadding * 2
    const columns = Math.max(1, Math.floor((content + SPEC.layout.gap) / (SPEC.layout.minCard + SPEC.layout.gap)))
    const width = Math.floor((content - SPEC.layout.gap * (columns - 1)) / columns)
    console.log(`  ${String(viewport).padStart(4)}px 视口 → 内容 ${content}px，${columns} 列，每卡 ${width}px`)
  }
}

if (process.argv[1]?.endsWith('ascii.mjs')) main()
