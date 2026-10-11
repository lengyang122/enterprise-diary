// 玻璃质感对比页（开发期用，不进入应用产物）
//   A = 我们现在的 .glass（backdrop-filter: blur + 白色渐变）
//   B = liquid-glass-react（SVG feDisplacementMap 边缘折射 + 色散）
// 玻璃后面必须有精细纹理，否则折射看不出来。
import { createRoot } from 'react-dom/client'
import LiquidGlass from 'liquid-glass-react'

// 精细纹理：让玻璃边缘的位移/色散可见
function Texture() {
  const lines = Array.from({ length: 30 })
  return (
    <div className="texture">
      {lines.map((_, i) => (
        <div className="tex" key={i}>
          企业实践日记 · PQE 质量管控 · SMT 车间 · QCP · 5Why · AOI · 2026-10-11
        </div>
      ))}
    </div>
  )
}

function Mesh() {
  return (
    <div className="mesh" aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </div>
  )
}

function Panel({ tag, note, children }: { tag: string; note: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <div className="head">
        <b>{tag}</b>
        <span>{note}</span>
      </div>
      <div className="stage">
        <Mesh />
        <Texture />
        <div className="overlay">{children}</div>
      </div>
    </section>
  )
}

function CardBody() {
  return (
    <div className="cardInner">
      <h3>今天发生了什么？</h3>
      <p>上午参加了产线巡检，记录了贴片机的抛料率异常。</p>
    </div>
  )
}

function App() {
  return (
    <div className="wrap">
      <Panel tag="A · 现在的 .glass" note="backdrop-filter: blur(28px) saturate(185%) + 白色渐变">
        <div className="row">
          <div className="ours card">
            <CardBody />
          </div>
          <div className="ours pillBtn">整理今天</div>
        </div>
      </Panel>

      <Panel tag="B · liquid-glass-react" note="backdrop-filter: url(#svg滤镜) —— 边缘折射 + 色散">
        <div className="row">
          {/* 官方最简用法：不加包裹容器、不覆盖 style */}
          <LiquidGlass
            displacementScale={90}
            blurAmount={0.12}
            saturation={150}
            aberrationIntensity={2}
            cornerRadius={20}
            padding="18px 20px"
          >
            <div className="plain">
              <h3>今天发生了什么？</h3>
              <p>上午参加了产线巡检，记录了贴片机的抛料率异常。</p>
            </div>
          </LiquidGlass>

          <LiquidGlass
            displacementScale={70}
            blurAmount={0.1}
            saturation={150}
            aberrationIntensity={2.5}
            cornerRadius={100}
            padding="14px 30px"
          >
            <span className="btnText">整理今天</span>
          </LiquidGlass>
        </div>
      </Panel>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
