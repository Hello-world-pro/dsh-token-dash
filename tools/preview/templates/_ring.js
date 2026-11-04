// 环的统一绘制：P1 / P2 / P3 共用一套几何，只有 size / stroke 与中心文案不同。
// 由 render.mjs 注入 /*__RING_JS__*/，所有预览模板共用，避免各写一份导致漂移。

/** 百分比 → 状态；critical 由调用方给（订阅 90 / API 100） */
function ringStateOf(percent, critical) {
  if (percent === null || percent === undefined) return 'empty'
  if (percent >= critical) return 'critical'
  if (percent >= window.__SPEC__.ring.warn) return 'warn'
  return 'normal'
}

/** 描边环 SVG：0% 与 empty 都不画弧（round linecap 会在 0 处留一个点） */
function ringSvg(size, stroke, percent, state) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const center = size / 2
  const arc = window.__SPEC__.ring.colors[state] ?? 'var(--text)'
  const filled = state === 'empty' || percent === null || percent === undefined
    ? 0
    : Math.max(0, Math.min(100, percent))
  const showArc = filled > 0
  return `
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
      <circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="var(--track)" stroke-width="${stroke}" />
      ${showArc ? `<circle cx="${center}" cy="${center}" r="${r}" fill="none"
        stroke="${arc}" stroke-width="${stroke}" stroke-linecap="round"
        transform="rotate(-90 ${center} ${center})"
        stroke-dasharray="${(c * filled / 100).toFixed(2)} ${c.toFixed(2)}" />` : ''}
    </svg>`
}
