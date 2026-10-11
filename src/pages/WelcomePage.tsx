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
// 视觉：不复用全站的 .glass（那套偏通透轻盈），
// 改用 index.css 里独立的 .auth-* 一套更收敛的参数 —— 圆角更小、
// 渐变更淡、饱和度更低，目标是「简约商务、干净克制」而不是网页模板感。
//
// 只出现一次：走过就写 localStorage 标记，之后直进主页；
// 设置页提供「重新观看」。
// ============================================================

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GlassBackground from '../components/GlassBackground'
import { BriefcaseIcon, SparkIcon } from '../components/icons'
import { EMPTY_PROFILE, getProfile, markEntered, saveProfile } from '../lib/storage'

type Stage = 'form' | 'checking' | 'reveal'

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
    <div className="auth-page relative min-h-screen flex items-center justify-center px-4 py-10">
      <GlassBackground />

      <main className="relative z-10 w-full max-w-[380px]">
        {stage === 'form' && (
          // 底部内边距比顶部小：「忘记密码？」是弱化的收尾元素，不该在它下面留一大块空
          <section className="auth-card px-6 pt-6 pb-4 animate-fadeIn" key="form">
            <header className="flex flex-col items-center text-center mb-6">
              <span className="auth-mark mb-3.5">
                <BriefcaseIcon size={20} />
              </span>
              <h1 className="text-[16px] font-semibold tracking-tight">企业实践日记</h1>
              <p className="text-[11.5px] text-ink-tertiary mt-1">记录每一天的成长</p>
            </header>

            {/* 登录 / 注册 切换 —— 两边行为完全一样，只为像那么回事 */}
            <div className="auth-tabs mb-5">
              {(['login', 'register'] as const).map(k => (
                <button
                  key={k}
                  type="button"
                  data-active={tab === k}
                  onClick={() => setTab(k)}
                  className="auth-tab"
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
              className="space-y-2.5"
            >
              {/* 字段说明直接写进 placeholder，不在上方单列标签 */}
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="姓名，比如：冷阳"
                autoComplete="off"
                aria-label="姓名"
                className="auth-field"
              />
              <input
                type="text"
                value={position}
                onChange={e => setPosition(e.target.value)}
                placeholder="实习岗位（可留空），比如：PQE 质量工程师"
                autoComplete="off"
                aria-label="实习岗位"
                className="auth-field"
              />

              <button type="submit" disabled={!canSubmit} className="auth-submit !mt-3.5">
                {tab === 'login' ? '登录' : '注册'}
              </button>
            </form>

            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => {
                  // 「忘记密码」也通向揭晓 —— 反正没有密码可以忘
                  if (canSubmit) start()
                }}
                className="auth-link"
              >
                忘记密码？
              </button>
            </div>
          </section>
        )}

        {stage === 'checking' && (
          <section
            key="checking"
            className="auth-card px-6 py-14 flex flex-col items-center animate-fadeIn"
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
          <section className="auth-card px-6 py-6 animate-fadeIn" key="reveal">
            <header className="flex flex-col items-center text-center mb-5">
              <span className="auth-mark mb-3.5" style={{ color: '#0A84FF' }}>
                <SparkIcon size={20} />
              </span>
              <h1 className="text-[18px] font-semibold tracking-tight">骗到你了 😄</h1>
              <p className="text-[12.5px] text-ink-secondary mt-1.5">这里没有账号，也没有服务器</p>
            </header>

            <div className="text-[13px] text-ink-secondary leading-relaxed space-y-2.5">
              <p>你刚才填的不是账号 —— 是这本日记的扉页署名。</p>
              <p className="text-[12px] text-ink-tertiary leading-relaxed">
                所有记录只存在这台设备的浏览器里，不会上传到任何服务器，也没有任何账号可以登录。
                <br />
                <span className="text-ink-secondary">
                  「{name.trim()}」{position.trim() ? `和「${position.trim()}」` : ''}
                  已写入设置，会用在 Word 导出的署名栏。
                </span>
              </p>
            </div>

            <button onClick={enter} disabled={saving} className="auth-submit !mt-6">
              {saving ? '正在进入…' : '开始记录'}
            </button>
          </section>
        )}
      </main>
    </div>
  )
}
