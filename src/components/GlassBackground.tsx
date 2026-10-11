// 背景光斑 —— 玻璃材质成立的前提：底下必须有东西可透。
// 低饱和配色（钢蓝 / 藕荷 / 灰青 / 一点暖褐），有层次但不跳；
// 光斑以 24–31s 的超慢速度漂移，让界面像在呼吸。
//
// 另有一层 .glass-grain：极淡颗粒，给玻璃提供细微的高频细节。
//
// 这里曾同时挂载 GlassFilterDefs（SVG 折射滤镜）。实测该滤镜让每帧耗时
// 从 6.9ms 涨到 39.6ms，而本项目背景是平滑渐变、折射根本看不见 —— 已移除。
export default function GlassBackground() {
  return (
    <>
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
