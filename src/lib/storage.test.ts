import { describe, it, expect, beforeEach } from 'vitest'
import {
  getProfile,
  saveProfile,
  getDiaries,
  insertDiary,
  deleteDiary,
  getDraft,
  saveDraft,
  clearDraft,
  EMPTY_PROFILE,
} from './storage'
import type { DiaryFormInput } from '../types'

describe('profile 存储', () => {
  beforeEach(() => localStorage.clear())

  it('无数据时返回 null', async () => {
    expect(await getProfile()).toBeNull()
  })

  it('保存后可读回', async () => {
    const saved = await saveProfile({ ...EMPTY_PROFILE, name: '李四' })
    expect(saved.name).toBe('李四')
    expect(saved.college).toBe('')
    expect((await getProfile())?.name).toBe('李四')
  })

  it('忽略历史遗留的 id / created_at / updated_at 字段', async () => {
    localStorage.setItem(
      'enterprise-diary-profile',
      JSON.stringify({
        id: 'legacy-id',
        name: '张三',
        student_id: '2300602425',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-02T00:00:00.000Z',
      })
    )
    const p = await getProfile()
    expect(p).not.toBeNull()
    expect(p!.name).toBe('张三')
    expect(Object.keys(p!).sort()).toEqual(Object.keys(EMPTY_PROFILE).sort())
  })

  it('损坏的 JSON 不会抛错', async () => {
    localStorage.setItem('enterprise-diary-profile', '{ 不是合法 JSON')
    expect(await getProfile()).toBeNull()
  })
})

describe('diary 存储', () => {
  beforeEach(() => localStorage.clear())

  it('空存储返回空数组', async () => {
    expect(await getDiaries()).toEqual([])
  })

  it('非数组数据返回空数组', async () => {
    localStorage.setItem('enterprise-diary-entries', JSON.stringify({ oops: true }))
    expect(await getDiaries()).toEqual([])
  })

  it('插入后最新一条在最前，并带上 id 与 created_at', async () => {
    await insertDiary({ date: '8月1日', position: 'PQE', content: 'A', feelings: '', other: '' })
    const second = await insertDiary({
      date: '8月2日',
      position: 'PQE',
      content: 'B',
      feelings: '',
      other: '',
    })
    const list = await getDiaries()
    expect(list).toHaveLength(2)
    expect(list[0].content).toBe('B')
    expect(second.id).toBeTruthy()
    expect(second.created_at).toBeTruthy()
  })

  it('迁移四字段时代的旧数据并写回新格式', async () => {
    localStorage.setItem(
      'enterprise-diary-entries',
      JSON.stringify([
        {
          id: '1',
          date: '7.17',
          position: 'PQE',
          generated_content: '旧内容',
          generated_feelings: '旧体会',
          generated_other: '旧其他',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ])
    )
    const list = await getDiaries()
    expect(list[0].content).toBe('旧内容')
    expect(list[0].feelings).toBe('旧体会')
    expect(list[0].other).toBe('旧其他')

    // 已写回新格式，旧字段被清除
    const raw = JSON.parse(localStorage.getItem('enterprise-diary-entries')!)
    expect(raw[0].generated_content).toBeUndefined()
    expect(raw[0].content).toBe('旧内容')
  })

  it('旧字段 today_work / learn_content / thinking 也参与回退', async () => {
    localStorage.setItem(
      'enterprise-diary-entries',
      JSON.stringify([
        { id: '1', date: '7.17', today_work: '工作', learn_content: '学到', thinking: '想法' },
      ])
    )
    const list = await getDiaries()
    expect(list[0].content).toBe('工作')
    expect(list[0].feelings).toBe('学到')
    expect(list[0].other).toBe('想法')
  })

  it('deleteDiary 按 id 删除', async () => {
    const e = await insertDiary({
      date: '8月1日',
      position: 'PQE',
      content: 'A',
      feelings: '',
      other: '',
    })
    await deleteDiary(e.id)
    expect(await getDiaries()).toEqual([])
  })
})

describe('草稿自动保存', () => {
  beforeEach(() => localStorage.clear())

  const form = (over: Partial<DiaryFormInput> = {}): DiaryFormInput => ({
    date: '8月1日',
    position: 'PQE',
    content: '',
    feelings: '',
    other: '',
    ...over,
  })

  it('无草稿时返回 null', async () => {
    expect(await getDraft()).toBeNull()
  })

  it('保存后可读回草稿与生成结果', async () => {
    await saveDraft(form({ content: '写了点东西' }), {
      content: 'A',
      feelings: 'B',
      other: 'C',
    })
    const d = await getDraft()
    expect(d?.form.content).toBe('写了点东西')
    expect(d?.form.position).toBe('PQE')
    expect(d?.aiResult?.feelings).toBe('B')
    expect(d?.updatedAt).toBeTruthy()
  })

  it('三段草稿与生成结果全空时不落库', async () => {
    await saveDraft(form(), null)
    expect(localStorage.getItem('enterprise-diary-draft')).toBeNull()
    expect(await getDraft()).toBeNull()
  })

  it('内容被清空时会移除已有草稿', async () => {
    await saveDraft(form({ content: '有内容' }), null)
    expect(await getDraft()).not.toBeNull()
    await saveDraft(form(), null)
    expect(await getDraft()).toBeNull()
  })

  it('clearDraft 清空草稿', async () => {
    await saveDraft(form({ content: '有内容' }), null)
    await clearDraft()
    expect(await getDraft()).toBeNull()
  })

  it('损坏的草稿数据不会抛错', async () => {
    localStorage.setItem('enterprise-diary-draft', '{ 坏掉')
    expect(await getDraft()).toBeNull()

    localStorage.setItem('enterprise-diary-draft', JSON.stringify({ form: '不是对象' }))
    expect(await getDraft()).toBeNull()
  })
})
