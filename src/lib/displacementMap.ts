// ============================================================
// 位移贴图生成
//
// 液态玻璃的折射靠 SVG feDisplacementMap 实现，它需要一张「位移贴图」：
//   R 通道 = X 方向位移量，B 通道 = Y 方向位移量，128 表示不位移。
//
// 这里用 canvas 按圆角矩形程序化生成：中心为中性值（不位移），
// 越靠近边界位移越强 —— 于是「只有边缘折射，中心不失真」。
//
// 不打包任何 base64 图片资源。
// ============================================================

/** 圆角矩形的有符号距离：内部为负，边界为 0 */
function roundedRectSDF(px: number, py: number, hw: number, hh: number, r: number): number {
  const radius = Math.min(r, hw, hh)
  const qx = Math.abs(px) - (hw - radius)
  const qy = Math.abs(py) - (hh - radius)
  const ax = Math.max(qx, 0)
  const ay = Math.max(qy, 0)
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - radius
}

const cache = new Map<string, string>()

/**
 * 生成一张位移贴图。
 * @param w 宽度（像素）
 * @param h 高度（像素）
 * @param radius 圆角半径。传 null 表示用短边的一半（胶囊/正圆）
 * @param band 折射带宽度（像素）
 */
export function buildDisplacementMap(w: number, h: number, radius: number, band: number): string {
  const key = `${w}x${h}x${Math.round(radius)}x${Math.round(band)}`
  const hit = cache.get(key)
  if (hit !== undefined) return hit

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const img = ctx.createImageData(w, h)
  const data = img.data
  const hw = w / 2
  const hh = h / 2

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - hw
      const py = y + 0.5 - hh

      const s = roundedRectSDF(px, py, hw, hh, radius)
      // 只在离边界 band 以内产生位移，且越贴边越强
      const t = Math.max(0, Math.min(1, 1 + s / band))
      const strength = t * t

      // 数值梯度 → 边界外法线方向
      const e = 1
      const gx =
        roundedRectSDF(px + e, py, hw, hh, radius) - roundedRectSDF(px - e, py, hw, hh, radius)
      const gy =
        roundedRectSDF(px, py + e, hw, hh, radius) - roundedRectSDF(px, py - e, hw, hh, radius)
      const len = Math.hypot(gx, gy) || 1

      const i = (y * w + x) * 4
      data[i] = Math.round(128 + (gx / len) * strength * 127)
      data[i + 1] = 128
      data[i + 2] = Math.round(128 + (gy / len) * strength * 127)
      data[i + 3] = 255
    }
  }

  ctx.putImageData(img, 0, 0)
  const url = canvas.toDataURL('image/png')
  cache.set(key, url)
  return url
}

/** 供全局滤镜使用的通用贴图（靠 preserveAspectRatio="none" 拉伸适配任意尺寸） */
export function getGlobalDisplacementMap(): string {
  return buildDisplacementMap(384, 384, 96, 62)
}

/** 当前浏览器是否支持 backdrop-filter 引用 SVG 滤镜（目前仅 Chromium） */
export const supportsUrlBackdropFilter: boolean =
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
    ? CSS.supports('backdrop-filter', 'url(#probe)')
    : false
