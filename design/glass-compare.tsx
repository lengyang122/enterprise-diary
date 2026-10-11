// 玻璃质感对比页（开发期用，不进入应用产物）
//   A = 纯磨砂（blur 28px + 白色底）—— 改动前的做法
//   B = 现在应用里的 .glass（叠加 SVG 折射滤镜）
//
// 用真实的 app CSS（脚本会把 dist 里构建好的 CSS 内联进来），B 侧直接就是线上那套样式。
// 玻璃后面必须有高频纹理 —— 折射是把背景像素按边缘法线搬移，
// 背景若是平滑渐变，搬移前后一模一样，效果等于零。
import { createRoot } from 'react-dom/client'

function Texture() {
  return (
    <div className="texture">
      {Array.from({ length: 30 }).map((_, i) => (
        <div className="tex" key={i}>
          企业实践日记 · PQE 质量管控 · SMT 车间 · QCP · 5Why · AOI · 2026-10-11
        </div>
      ))}
    </div>
  )
}

function Mesh({ soft }: { soft?: boolean }) {
  return (
    <div className={`mesh${soft ? ' mesh-soft' : ''}`} aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </div>
  )
}

function Panel({
  tag,
  note,
  soft,
  children,
}: {
  tag: string
  note: string
  soft?: boolean
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="head">
        <b>{tag}</b>
        <span>{note}</span>
      </div>
      <div className="stage">
        <Mesh soft={soft} />
        {!soft && <Texture />}
        <div className="overlay">
          <div className="stack">{children}</div>
        </div>
      </div>
    </section>
  )
}

function Body() {
  return (
    <div className="body">
      <h3>今天发生了什么？</h3>
      <p>上午参加了产线巡检，记录了贴片机的抛料率异常。</p>
    </div>
  )
}

const CARD = 'card'
const PILL = 'pill'
const NAV = 'miniNav'

function App() {
  return (
    <div className="wrap">
      {/* 第一行：精细纹理背景 —— 折射是否成立，这里有细节可弯折 */}
      <Panel tag="A · 纯磨砂 + 纹理背景" note="backdrop-filter: blur(28px) saturate(185%)">
        <div className={`plainGlass ${CARD}`}>
          <Body />
        </div>
        <div className={`plainGlass ${PILL}`}>
          <span className="pillText">整理今天</span>
        </div>
      </Panel>

      <Panel tag="B · 折射滤镜 + 纹理背景" note="backdrop-filter: blur(6px) url(#glass-refraction)">
        <div className={`glass ${CARD}`}>
          <Body />
        </div>
        <div className={`glass ${PILL}`}>
          <span className="pillText">整理今天</span>
        </div>
      </Panel>

      {/* 第二行：柔和渐变背景（应用的真实情况）—— 用来看折射还剩多少 */}
      <Panel tag="C · 纯磨砂 + 柔和渐变" note="应用的实际情况：背景无高频细节" soft>
        <div className={`plainGlass ${CARD}`}>
          <Body />
        </div>
        <div className={`plainGlass ${NAV}`}>
          <span className="miniItem miniActive">新建日记</span>
          <span className="miniItem">历史记录</span>
        </div>
      </Panel>

      <Panel tag="D · 折射滤镜 + 柔和渐变" note="折射基本不可见 —— 没有细节可弯折" soft>
        <div className={`glass ${CARD}`}>
          <Body />
        </div>
        <div className={`glass ${NAV}`}>
          <span className="miniItem miniActive">新建日记</span>
          <span className="miniItem">历史记录</span>
        </div>
      </Panel>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
