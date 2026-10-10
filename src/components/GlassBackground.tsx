// 背景光斑 —— 玻璃材质成立的前提：底下必须有东西可透。
// 低饱和配色（钢蓝 / 藕荷 / 灰青 / 一点暖褐），有层次但不跳；
// 光斑以 24–31s 的超慢速度漂移，让界面像在呼吸。
export default function GlassBackground() {
  return (
    <div className="glass-mesh" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </div>
  )
}
