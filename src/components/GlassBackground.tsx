// 背景光斑 —— 玻璃材质成立的前提：底下必须有东西可透。
// 低饱和配色（钢蓝 / 藕荷 / 灰青 / 一点暖褐），有层次但不跳；
// 光斑以 24–31s 的超慢速度漂移，让界面像在呼吸。
//
// 另有两层配套：
//   GlassFilterDefs —— 全局液态玻璃滤镜定义，供 .glass 的 backdrop-filter 引用
//   .glass-grain    —— 极淡颗粒，给折射提供可弯折的高频细节
import GlassFilterDefs from './GlassFilterDefs'

export default function GlassBackground() {
  return (
    <>
      <GlassFilterDefs />
      <div className="glass-mesh" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="glass-grain" aria-hidden="true" />
    </>
  )
}
