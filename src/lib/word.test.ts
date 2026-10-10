import { describe, it, expect } from 'vitest'
import { replaceInXml, safeText } from './word'
import { countHanzi } from './text'

const singleRun =
  '<w:body><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>姓名：魏源</w:t></w:r></w:p></w:body>'

describe('replaceInXml', () => {
  it('替换文本并保留 <w:rPr> 格式', () => {
    const out = replaceInXml(singleRun, '魏源', '张三')
    expect(out).toContain('张三')
    expect(out).not.toContain('魏源')
    expect(out).toContain('<w:rPr><w:b/></w:rPr>')
    expect(out).toContain('<w:t xml:space="preserve">')
  })

  it('目标文本被 Word 拆分到多个 <w:r> 时仍能替换', () => {
    const split = '<w:p><w:r><w:t>魏</w:t></w:r><w:r><w:t>源</w:t></w:r></w:p>'
    const out = replaceInXml(split, '魏源', '张三')
    expect(out).toContain('张三')
    expect(out).not.toContain('魏')
    expect(out).not.toContain('源')
  })

  it('对 XML 特殊字符做转义', () => {
    const out = replaceInXml(singleRun, '魏源', 'A&B<C>')
    expect(out).toContain('A&amp;B&lt;C&gt;')
  })

  it('oldText 为空时原样返回', () => {
    expect(replaceInXml(singleRun, '', 'X')).toBe(singleRun)
  })

  // 固化当前行为：模板里找不到目标文本时静默返回原文。
  // 调用方必须自行校验替换是否生效（V2 将改造为显式报错）。
  it('找不到目标文本时原样返回，不抛错', () => {
    expect(replaceInXml(singleRun, '模板里不存在的文本', 'X')).toBe(singleRun)
  })
})

describe('safeText', () => {
  it('未超出上限时原样返回', () => {
    expect(safeText('质量管控', 80)).toBe('质量管控')
  })

  it('超出上限时截断并补句号', () => {
    const out = safeText('质'.repeat(82), 80)
    expect(out.endsWith('。')).toBe(true)
    expect(countHanzi(out)).toBe(80)
  })
})
