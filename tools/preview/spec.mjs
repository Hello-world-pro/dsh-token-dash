/**
 * 预览规格单一来源。
 *
 * 三处消费者必须从这里取值，禁止各写一份：
 *   1. tools/preview/render.mjs（HTML 预览）
 *   2. tools/preview/ascii.mjs（ASCII 草图）
 *   3. scripts/e2e.mjs（尺寸断言，后续接入）
 *
 * 修改尺寸只改本文件；预览、草图、断言一起跟上。
 */

export const SPEC = {
  /** P3 中栏内容宽与卡片网格 */
  layout: {
    contentWidth: 952, // 1000 中栏 − 24 × 2 padding
    gap: 12,
    minCard: 220,
    pagePadding: 24,
  },
  card: {
    radius: 8,
    padding: 14,
    gap: 12,
    headerFont: 13,
    chipFont: 11,
  },
  /** 订阅卡内的 QuotaGauge */
  gauge: {
    ring: 40,
    stroke: 4,
    label: 12, // 环心周期
    percent: 16, // 环下百分比
    meta: 11, // 剩余 / 倒计时 / 绝对时间
    gap: 4,
    percentOffset: 3, // 环与百分比之间的额外间距
  },
  /** 按量卡内的环：与订阅同款（环心标签 + 环下百分比），只是中心文案不同 */
  apiGauge: {
    ring: 40,
    stroke: 4,
    label: '已用',
  },
  /** P2 用量表 */
  table: {
    rowHeight: 28,
    headerFont: 12,
    cellPaddingX: 4,
    dividerAlpha: 0.06,
  },
  /** P2 浮层宽度区间 */
  panel: { minWidth: 280, maxWidth: 480 },
  /** 页级 ASCII 草图的比例尺：1 字符 ≈ 9.6px */
  charsPerPx: 1 / 9.6,
}

/** auto-fit / minmax(minCard, 1fr) 在给定内容宽下的列数 */
export const columnCount = (
  contentWidth = SPEC.layout.contentWidth,
  minCard = SPEC.layout.minCard,
  gap = SPEC.layout.gap,
) => Math.max(1, Math.floor((contentWidth + gap) / (minCard + gap)))

/** 给定列数时每张卡的实际宽度（px，向下取整） */
export const cardWidth = (
  contentWidth = SPEC.layout.contentWidth,
  columns = columnCount(),
  gap = SPEC.layout.gap,
) => Math.floor((contentWidth - gap * (columns - 1)) / columns)

/** px → 页级草图的字符数（四舍五入） */
export const toChars = (px) => Math.max(4, Math.round(px * SPEC.charsPerPx))
