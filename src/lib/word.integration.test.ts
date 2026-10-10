// ============================================================
// Word 导出的端到端校验 —— 直接跑真实内嵌模板
// 这组用例的价值：模板一旦被改动导致占位失配，会立刻失败，
// 而不是等到使用者拿到一份「顶着别人名字」的日记才发现。
// ============================================================

import { describe, it, expect, vi } from 'vitest'
import JSZip from 'jszip'
import { TEMPLATE_BASE64 } from './templateData'
import {
  applySlots,
  buildWordBlob,
  flattenRunText,
  downloadWord,
  downloadAllWords,
  defaultWordFileName,
  TEMPLATE_SLOTS,
} from './word'
import type { DiaryWordData } from '../types'

const { saveAsMock } = vi.hoisted(() => ({ saveAsMock: vi.fn() }))
vi.mock('file-saver', () => ({ saveAs: saveAsMock }))

// 每一项都与模板旧值不同，便于断言「旧值已消失、新值已写入」
const sample: DiaryWordData = {
  name: '测试姓名',
  student_id: '2300000000',
  class_name: '测试班级',
  college: '测试学院',
  teacher: '测试教师',
  company: '测试实习单位',
  company_teacher: '测试师傅',
  start_date: '2026年9月1日',
  end_date: '2026年12月31日',
  date: '9月2日',
  position: 'PE',
  content: '今天在产线跟进了贴片异常的处理，并参与了异常分析会议。',
  feelings: '理解了防错设计对产线稳定性的意义。',
  other: '记录了设备点检的关键要点。',
}

async function loadTemplateXml(): Promise<string> {
  const binary = atob(TEMPLATE_BASE64)
  const buf = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
  const zip = await JSZip.loadAsync(buf)
  const file = zip.file('word/document.xml')
  if (!file) throw new Error('模板缺少 word/document.xml')
  return file.async('string')
}

describe('真实模板：占位可定位性', () => {
  it('每个占位文本都能在模板中找到', async () => {
    const flat = flattenRunText(await loadTemplateXml())
    const missing = TEMPLATE_SLOTS.filter(s => !flat.includes(s.oldText)).map(s => s.label)
    expect(missing).toEqual([])
  })

  it('只有「岗位」占位在模板中重复出现，且真正的字段排在旧正文之前', async () => {
    const flat = flattenRunText(await loadTemplateXml())
    const duplicated = TEMPLATE_SLOTS.filter(s => flat.split(s.oldText).length - 1 > 1).map(
      s => s.label
    )
    expect(duplicated).toEqual(['岗位'])

    // 「实习岗位：PQE」必须排在含 PQE 的旧正文之前，
    // 这样「只替换第一处」才既命中正确字段、又不误伤用户自己写的 PQE
    const slotIdx = flat.indexOf('实习岗位：PQE')
    const contentIdx = flat.indexOf('实习内容：')
    expect(slotIdx).toBeGreaterThan(-1)
    expect(slotIdx).toBeLessThan(contentIdx)
  })
})

describe('真实模板：替换链路', () => {
  it('applySlots 全部命中，无失配', async () => {
    const { missing, applied } = applySlots(await loadTemplateXml(), sample)
    expect(missing).toEqual([])
    expect(applied.sort()).toEqual(TEMPLATE_SLOTS.map(s => s.label).sort())
  })

  it('替换后模板旧内容全部消失', async () => {
    const { xml } = applySlots(await loadTemplateXml(), sample)
    const flat = flattenRunText(xml)
    for (const slot of TEMPLATE_SLOTS) {
      expect(flat, `旧占位「${slot.label}」仍有残留`).not.toContain(slot.oldText)
    }
  })

  it('替换后新内容全部写入', async () => {
    const { xml } = applySlots(await loadTemplateXml(), sample)
    const flat = flattenRunText(xml)
    const expected = [
      sample.name,
      sample.student_id,
      sample.class_name,
      sample.college,
      sample.teacher,
      sample.company,
      sample.company_teacher,
      sample.start_date,
      sample.end_date,
      sample.date,
      sample.position,
      sample.content,
      sample.feelings,
      sample.other,
    ]
    for (const value of expected) {
      expect(flat, `新值「${value}」未写入`).toContain(value)
    }
  })

  it('模板骨架（标题与栏目标签）保持完整', async () => {
    const { xml } = applySlots(await loadTemplateXml(), sample)
    const flat = flattenRunText(xml)
    for (const skeleton of ['企业实践日记', '姓    名：', '实习岗位：', '实习内容：', '备注：']) {
      expect(flat).toContain(skeleton)
    }
  })
})

describe('真实模板：生成 docx', () => {
  it('buildWordBlob 产出可解析的 docx，且已填入新内容', async () => {
    const blob = await buildWordBlob(sample)
    expect(blob.size).toBeGreaterThan(1000)

    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    const xml = await zip.file('word/document.xml')!.async('string')
    const flat = flattenRunText(xml)

    expect(flat).toContain(sample.name)
    expect(flat).not.toContain('魏源')
    expect(flat).not.toContain('2300602425')
  })

  it('默认文件名包含姓名与日期', () => {
    expect(defaultWordFileName(sample)).toBe('企业实践日记_测试姓名_9月2日.docx')
  })

  it('姓名为空时用「未署名」兜底', () => {
    expect(defaultWordFileName({ ...sample, name: '' })).toContain('未署名')
  })
})

describe('批量导出', () => {
  it('downloadWord 触发单文件下载', async () => {
    saveAsMock.mockClear()
    await downloadWord(sample)
    expect(saveAsMock).toHaveBeenCalledTimes(1)
    expect(saveAsMock.mock.calls[0][1]).toBe('企业实践日记_测试姓名_9月2日.docx')
  })

  it('downloadAllWords 打包为一个 zip，每篇一个 docx', async () => {
    saveAsMock.mockClear()
    const name = await downloadAllWords([
      { data: { ...sample, date: '9月2日' }, fileName: '日记A.docx' },
      { data: { ...sample, date: '9月3日' }, fileName: '日记B.docx' },
    ])

    expect(name).toMatch(/\.zip$/)
    const blob = saveAsMock.mock.calls[0][0] as Blob
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    expect(Object.keys(zip.files).sort()).toEqual(['日记A.docx', '日记B.docx'])
  })

  it('同名文件自动加序号，避免互相覆盖', async () => {
    saveAsMock.mockClear()
    await downloadAllWords([
      { data: sample, fileName: '相同.docx' },
      { data: sample, fileName: '相同.docx' },
    ])
    const blob = saveAsMock.mock.calls[0][0] as Blob
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    expect(Object.keys(zip.files).sort()).toEqual(['相同(2).docx', '相同.docx'])
  })

  it('没有可导出内容时报错而不是产出空 zip', async () => {
    await expect(downloadAllWords([])).rejects.toThrow('没有可导出的日记')
  })
})
