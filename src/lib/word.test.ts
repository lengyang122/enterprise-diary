import { describe, it, expect } from 'vitest'
import {
  replaceInXml,
  safeText,
  flattenRunText,
  applySlots,
  checkExportData,
  describeExportCheck,
  WordTemplateError,
  TEMPLATE_SLOTS,
} from './word'
import { countHanzi } from './text'
import type { DiaryWordData } from '../types'

const singleRun =
  '<w:body><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>姓名：魏源</w:t></w:r></w:p></w:body>'

const baseData: DiaryWordData = {
  name: '张三',
  student_id: '2300000000',
  class_name: '质卓4',
  college: '管理工程与科学',
  teacher: '陈家焱',
  company: '某某公司',
  company_teacher: '陶凯',
  start_date: '2026年9月1日',
  end_date: '2026年12月31日',
  date: '9月2日',
  position: 'PQE',
  content: '今天在产线跟进异常。',
  feelings: '理解了防错。',
  other: '记录了要点。',
}

describe('replaceInXml', () => {
  it('替换文本并保留 <w:rPr> 格式', () => {
    const { xml, replaced } = replaceInXml(singleRun, '魏源', '张三')
    expect(replaced).toBe(true)
    expect(xml).toContain('张三')
    expect(xml).not.toContain('魏源')
    expect(xml).toContain('<w:rPr><w:b/></w:rPr>')
    expect(xml).toContain('<w:t xml:space="preserve">')
  })

  it('目标文本被 Word 拆分到多个 <w:r> 时仍能替换', () => {
    const split = '<w:p><w:r><w:t>魏</w:t></w:r><w:r><w:t>源</w:t></w:r></w:p>'
    const { xml, replaced } = replaceInXml(split, '魏源', '张三')
    expect(replaced).toBe(true)
    expect(xml).toContain('张三')
    expect(xml).not.toContain('魏')
  })

  it('对 XML 特殊字符做转义', () => {
    const { xml } = replaceInXml(singleRun, '魏源', 'A&B<C>')
    expect(xml).toContain('A&amp;B&lt;C&gt;')
  })

  it('oldText 为空时不做任何改动', () => {
    expect(replaceInXml(singleRun, '', 'X')).toEqual({ xml: singleRun, replaced: false })
  })

  it('找不到目标文本时回报 replaced=false，而不是静默返回', () => {
    const r = replaceInXml(singleRun, '模板里不存在的文本', 'X')
    expect(r.replaced).toBe(false)
    expect(r.xml).toBe(singleRun)
  })

  it('只替换第一处命中', () => {
    const two = '<w:p><w:r><w:t>甲甲</w:t></w:r></w:p>'
    const { xml } = replaceInXml(two, '甲', '乙')
    expect(xml).toContain('乙甲')
  })
})

describe('flattenRunText', () => {
  it('按顺序拼接所有 run 的文本', () => {
    const split = '<w:p><w:r><w:t>甲</w:t></w:r><w:r><w:t>乙</w:t></w:r></w:p>'
    expect(flattenRunText(split)).toBe('甲乙')
  })

  it('忽略没有 <w:t> 的 run', () => {
    expect(flattenRunText('<w:p><w:r><w:br/></w:r><w:r><w:t>甲</w:t></w:r></w:p>')).toBe('甲')
  })
})

describe('applySlots', () => {
  it('逐项汇报命中与失配', () => {
    const { applied, missing } = applySlots('<w:body><w:r><w:t>魏源</w:t></w:r></w:body>', baseData)
    expect(applied).toEqual(['姓名'])
    expect(missing).toHaveLength(TEMPLATE_SLOTS.length - 1)
    expect(missing).not.toContain('姓名')
  })

  it('全部失配时 applied 为空', () => {
    const { applied, missing } = applySlots('<w:body></w:body>', baseData)
    expect(applied).toEqual([])
    expect(missing).toHaveLength(TEMPLATE_SLOTS.length)
  })
})

describe('WordTemplateError', () => {
  it('错误信息里指明失配字段', () => {
    const err = new WordTemplateError(['姓名', '学号'])
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('WordTemplateError')
    expect(err.missing).toEqual(['姓名', '学号'])
    expect(err.message).toContain('姓名')
    expect(err.message).toContain('学号')
  })
})

describe('checkExportData', () => {
  it('信息填全时无提示', () => {
    const check = checkExportData(baseData)
    expect(check.missingProfile).toEqual([])
    expect(check.emptySections).toEqual([])
    expect(describeExportCheck(check)).toBe('')
  })

  it('列出未填写的个人信息', () => {
    const check = checkExportData({ ...baseData, name: '', student_id: '   ' })
    expect(check.missingProfile).toEqual(['姓名', '学号'])
    expect(describeExportCheck(check)).toContain('姓名')
  })

  it('列出为空的正文栏目', () => {
    const check = checkExportData({ ...baseData, content: '' })
    expect(check.emptySections).toEqual(['实习内容'])
    expect(describeExportCheck(check)).toContain('实习内容')
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
