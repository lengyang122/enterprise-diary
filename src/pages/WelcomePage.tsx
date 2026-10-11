// ============================================================
// 首次进入页 —— 一个「假登录」
//
// 三段式：
//   form     看起来像登录/注册表单（其实问的是名字和岗位）
//   checking 短暂的「正在验证…」，吊一下期待
//   reveal   揭晓：这里根本没有账号系统
//
// 设计取舍：**刻意不做密码框**。
// 有密码框的页面是钓鱼站的标准形态，会被浏览器安全扫描标记，
// 密码管理器也会弹「是否保存密码」。改成问名字与岗位后，
// 既保住了「填表 → 提交 → 揭晓」的仪式感，填的内容还真的有用
// —— 直接写进个人资料，用于 Word 导出的署名栏。
//
// 只出现一次：走过就写 localStorage 标记，之后直进主页；
// 设置页提供「重新观看」。
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GlassBackground from '../components/GlassBackground'
import { DocIcon, SparkIcon } from '../components/icons'
import { EMPTY_PROFILE, getProfile, markEntered, saveProfile } from '../lib/storage'

type Stage = 'form' | 'checking' | 'reveal'

const FIELD =
  'w-full bg-white/55 border border-white/70 rounded-[13px] px-4 py-3 text-[14.5px] text-ink ' +
  'placeholder:text-ink-tertiary outline-none transition-colors duration-200 ' +
  'focus:bg-white/80 focus:ring-1 focus:ring-accent/40'

export default function WelcomePage() {
  const navigate = useNavigate()
  const [stage, setStage] = useState<Stage>('form')
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [saving, setSaving] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [])

  const canSubmit = name.trim().length > 0

  function start() {
    if (!canSubmit) return
    setStage('checking')
    timer.current = window.setTimeout(() => setStage('reveal'), 1250)
  }

  async function enter() {
    setSaving(true)
    // 把「注册」填的内容真的写进个人资料 —— 这是整个设计的落点
    const existing = await getProfile()
    await saveProfile({
      ...(existing ?? EMPTY_PROFILE),
      name: name.trim(),
      ...(position.trim() ? { company: position.trim() } : {}),
    })
    markEntered()
    navigate('/', { replace: true })
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
      <GlassBackground />

      <main className="relative z-10 w-full max-w-[400px]">
        {stage === 'form' && (
          <section className="glass rounded-glass-lg px-7 py-8 animate-riseIn" key="form">
            <header className="flex flex-col items-center text-center mb-7">
              <span
                className="w-12 h-12 rounded-[16px] text-white grid place-items-center mb-3.5"
                style={{
                  background: 'linear-gradient(160deg,#4EA8FF,#0A84FF)',
                  boxShadow:
                    '0 10px 26px -8px rgba(10,132,255,.85), inset 0 1px 0 rgba(255,255,255,.6)',
                }}
              >
                <DocIcon size={24} />
              </span>
              <h1 className="text-[17px] font-semibold tracking-tight">企业实践日记</h1>
              <p className="text-[12px] text-ink-tertiary mt-1.5">记录每一天的成长</p>
            </header>

            {/* 登录 / 注册 切换 —— 两边行为完全一样，只为像那么回事 */}
            <div className="flex gap-1 p-1 rounded-[13px] bg-white/45 border border-white/60 mb-6">
              {(['login', 'register'] as const).map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={`flex-1 tap-min py-2 rounded-[10px] text-[13px] transition-all duration-300 ease-ios ${
                    tab === k
                      ? 'bg-white/85 text-ink font-semibold shadow-glass-sm'
                      : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  {k === 'login' ? '登录' : '注册'}
                </button>
              ))}
            </div>

            <form
              onSubmit={e => {
                e.preventDefault()
                start()
              }}
              className="space-y-4"
            >
              <label className="block">
                <span className="block text-[12.5px] text-ink-secondary mb-2">你的名字</span>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="比如：冷阳"
                  autoComplete="off"
                  className={FIELD}
                />
              </label>

              <label className="block">
                <span className="block text-[12.5px] text-ink-secondary mb-2">
                  实习岗位 <span className="text-ink-tertiary">（可留空）</span>
                </span>
                <input
                  type="text"
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  placeholder="比如：PQE 质量工程师"
                  autoComplete="off"
                  className={FIELD}
                />
              </label>

              <button
                type="submit"
                disabled={!canSubmit}
                className="btn-primary w-full justify-center py-3.5 mt-1 disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {tab === 'login' ? '登 录' : '注 册'}
              </button>
            </form>

            <div className="flex justify-center mt-5">
              <button
                type="button"
                onClick={() => {
                  // 「忘记密码」也通向揭晓 —— 反正没有密码可以忘
                  if (canSubmit) start()
                }}
                className="tap-min inline-flex items-center px-4 text-[12px] text-ink-tertiary hover:text-accent transition-colors duration-200"
              >
                忘记密码？
              </button>
            </div>
          </section>
        )}

        {stage === 'checking' && (
          <section
            key="checking"
            className="glass rounded-glass-lg px-7 py-14 flex flex-col items-center animate-fadeIn"
          >
            <div className="flex items-center gap-1.5 mb-6">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-accent animate-softPulse"
                  style={{ animationDelay: `${i * 0.22}s` }}
                />
              ))}
            </div>
            <p className="text-[13.5px] text-ink-secondary tracking-wide">正在验证…</p>
          </section>
        )}

        {stage === 'reveal' && (
          <section className="glass rounded-glass-lg px-7 py-8 animate-popIn" key="reveal">
            <header className="flex flex-col items-center text-center mb-5">
              <span className="w-12 h-12 rounded-full grid place-items-center mb-4 text-accent bg-accent-soft">
                <SparkIcon size={24} />
              </span>
              <h1 className="text-[19px] font-semibold tracking-tight">骗到你了 😄</h1>
              <p className="text-[13px] text-ink-secondary mt-2">这里没有账号，也没有服务器</p>
            </header>

            <div className="text-[13.5px] text-ink-secondary leading-relaxed space-y-3">
              <p>
                你刚才填的不是账号 —— 是这本日记的扉页署名。
              </p>
              <p className="text-[12.5px] text-ink-tertiary leading-relaxed">
                所有记录只存在这台设备的浏览器里，不会上传到任何服务器，也没有任何账号可以登录。
                <br />
                <span className="text-ink-secondary">
                  「{name.trim()}」{position.trim() ? `和「${position.trim()}」` : ''}
                  已写入设置，会用在 Word 导出的署名栏。
                </span>
              </p>
            </div>

            <button
              onClick={enter}
              disabled={saving}
              className="btn-primary w-full justify-center py-3.5 mt-7 disabled:opacity-60"
            >
              {saving ? '正在进入…' : '开始记录'}
            </button>
          </section>
        )}
      </main>
    </div>
  )
}
