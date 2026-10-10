import { describe, it, expect } from 'vitest'
import {
  countHanzi,
  truncateToSentence,
  parseSections,
  sectionScore,
  stripMarkers,
} from './text'

describe('countHanzi', () => {
  it('只统计 CJK 统一表意文字', () => {
    expect(countHanzi('质量管控')).toBe(4)
    expect(countHanzi('')).toBe(0)
  })

  it('不统计英文、数字与中文标点', () => {
    expect(countHanzi('PQE 质量管控 123')).toBe(4)
    expect(countHanzi('，。！？；：')).toBe(0)
  })
})

describe('truncateToSentence', () => {
  it('未超出上限时原样返回', () => {
    expect(truncateToSentence('今天学习了QCP。', 200)).toBe('今天学习了QCP。')
  })

  it('超出上限时在最近的句末截断', () => {
    const text = '第一句话。第二句话。第三句话。'
    expect(countHanzi(text)).toBe(12)
    expect(truncateToSentence(text, 5)).toBe('第一句话。')
  })

  it('整段没有句末标点时按字数硬截断', () => {
    expect(truncateToSentence('质量管控流程学习', 4)).toBe('质量管控')
  })

  it('截断后汉字数不超过上限', () => {
    const text = '我是实习生，今天在产线跟进异常处理工作，学习了QCP管控逻辑，收获很多。'
    const out = truncateToSentence(text, 10)
    expect(countHanzi(out)).toBeLessThanOrEqual(10)
  })
})

describe('parseSections', () => {
  it('解析 ===标记=== 格式', () => {
    const raw =
      '===实习内容===\n今天在SMT车间学习。\n===实习体会和感受===\n理解了QCP。\n===其他===\n质量第一。'
    const r = parseSections(raw)
    expect(r.valid).toBe(true)
    expect(r.content).toBe('今天在SMT车间学习。')
    expect(r.feelings).toBe('理解了QCP。')
    expect(r.other).toBe('质量第一。')
  })

  it('解析【标记】格式', () => {
    const raw = '【实习内容】今天在车间。\n【其他】质量第一。'
    const r = parseSections(raw)
    expect(r.valid).toBe(true)
    expect(r.content).toBe('今天在车间。')
    expect(r.other).toBe('质量第一。')
  })

  it('解析 markdown 标题与加粗', () => {
    const raw = '## 实习内容\n今天做工装。\n\n## 实习体会和感受\n有收获。'
    const r = parseSections(raw)
    expect(r.valid).toBe(true)
    expect(r.content).toBe('今天做工装。')
    expect(r.feelings).toBe('有收获。')
  })

  it('解析独占一行的裸标题', () => {
    const raw = '实习内容\n今天在产线跟进。\n实习体会和感受\n理解了防错。'
    const r = parseSections(raw)
    expect(r.valid).toBe(true)
    expect(r.content).toBe('今天在产线跟进。')
    expect(r.feelings).toBe('理解了防错。')
  })

  it('标记少于两个时判定为无效结构', () => {
    expect(parseSections('===实习内容===\n只有一段内容').valid).toBe(false)
    expect(parseSections('随便一段没有标记的文本').valid).toBe(false)
  })

  it('没有内容栏时判定为无效（走降级路径）', () => {
    const r = parseSections('===实习体会===\n有收获。\n===其他===\n无。')
    expect(r.valid).toBe(false)
  })
})

describe('sectionScore', () => {
  it('无效结构得 0 分', () => {
    expect(sectionScore({ content: '甲', feelings: '', other: '', valid: false })).toBe(0)
  })

  it('有效结构按汉字总数计分', () => {
    const score = sectionScore({ content: '质量管控', feelings: '学习', other: '', valid: true })
    expect(score).toBe(6)
  })
})

describe('stripMarkers', () => {
  it('去掉残留标记符号并归一空白', () => {
    expect(stripMarkers('===实习内容=== 今天在车间。 【其他】 质量第一。')).toBe(
      '今天在车间。 质量第一。'
    )
  })
})
