// 全局液态玻璃滤镜
//
// 挂一份 SVG 滤镜定义在文档里，让现有的 .glass 类直接用
// backdrop-filter: url(#glass-refraction) 引用 —— 这样不必改动各处 JSX，
// 全站玻璃面一次生效。
//
// 贴图用 preserveAspectRatio="none" 拉伸适配任意尺寸的元素，
// 所以一份定义就能覆盖所有大小（代价是圆角处折射带宽度不完全均匀，视觉上可接受）。
import { useEffect, useState } from 'react'
import { getGlobalDisplacementMap, supportsUrlBackdropFilter } from '../lib/displacementMap'

export const GLASS_FILTER_ID = 'glass-refraction'

/** 全局统一的位移强度（像素）。太大边缘会撕裂，太小看不出折射。 */
const SCALE = 18
const ABERRATION = 1.6

export default function GlassFilterDefs() {
  const [map, setMap] = useState('')

  useEffect(() => {
    if (supportsUrlBackdropFilter) setMap(getGlobalDisplacementMap())
  }, [])

  if (!map) return null

  return (
    <svg aria-hidden="true" style={{ position: 'fixed', width: 0, height: 0 }}>
      <defs>
        <filter
          id={GLASS_FILTER_ID}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          colorInterpolationFilters="sRGB"
        >
          <feImage
            href={map}
            x="0"
            y="0"
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            result="MAP"
          />

          {/* R 通道 */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="MAP"
            scale={-SCALE}
            xChannelSelector="R"
            yChannelSelector="B"
            result="RD"
          />
          <feColorMatrix
            in="RD"
            type="matrix"
            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="RC"
          />

          {/* G 通道：位移量略不同 → 边缘色散 */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="MAP"
            scale={-SCALE * (1 - ABERRATION * 0.03)}
            xChannelSelector="R"
            yChannelSelector="B"
            result="GD"
          />
          <feColorMatrix
            in="GD"
            type="matrix"
            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
            result="GC"
          />

          {/* B 通道 */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="MAP"
            scale={-SCALE * (1 - ABERRATION * 0.06)}
            xChannelSelector="R"
            yChannelSelector="B"
            result="BD"
          />
          <feColorMatrix
            in="BD"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            result="BC"
          />

          <feBlend in="GC" in2="BC" mode="screen" result="GB" />
          <feBlend in="RC" in2="GB" mode="screen" result="RGB" />
        </filter>
      </defs>
    </svg>
  )
}
