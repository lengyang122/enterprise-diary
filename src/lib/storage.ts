// ============================================================
// 本地存储层 — 全部数据存 localStorage，无后端
// 含旧版本数据迁移：
//   Profile：忽略历史遗留的 id / created_at / updated_at
//   Diary  ：自动识别四字段时代的旧数据并转换为新三字段结构
// ============================================================

import type {
  Profile,
  DiaryEntry,
  DiaryFormInput,
  AIGeneratedResult,
  DraftState,
} from '../types'

// === Profile ===

const PROFILE_KEY = 'enterprise-diary-profile'

export const EMPTY_PROFILE: Profile = {
  name: '',
  student_id: '',
  class_name: '',
  college: '',
  major: '',
  teacher: '',
  company: '',
  company_teacher: '',
  start_date: '',
  end_date: '',
}

// 防御：保证字段存在且为字符串（旧版本可能带 id / 时间戳，直接忽略）
function normalizeProfile(raw: Record<string, unknown> | null): Profile {
  const out = { ...EMPTY_PROFILE }
  if (!raw) return out
  for (const key of Object.keys(EMPTY_PROFILE) as (keyof Profile)[]) {
    const v = raw[key]
    if (typeof v === 'string') out[key] = v
  }
  return out
}

export async function getProfile(): Promise<Profile | null> {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return null
    return normalizeProfile(JSON.parse(raw))
  } catch {
    return null
  }
}

/* ============================================================
   进入标记
   首次打开会先经过 /welcome 那个「假登录」页；
   走过一次就记下标记，之后直接进主页。设置页可以重置重看。
   ============================================================ */

const ENTERED_KEY = 'enterprise-diary-entered'

export function hasEntered(): boolean {
  try {
    return localStorage.getItem(ENTERED_KEY) === '1'
  } catch {
    // 隐私模式等禁用 localStorage 的场景：当作已进入，避免把用户卡在门口
    return true
  }
}

export function markEntered(): void {
  try {
    localStorage.setItem(ENTERED_KEY, '1')
  } catch {
    /* 存不下就存不下，不该因此挡住用户 */
  }
}

export function resetEntered(): void {
  try {
    localStorage.removeItem(ENTERED_KEY)
  } catch {
    /* 同上 */
  }
}

export async function saveProfile(data: Profile): Promise<Profile> {
  const clean = normalizeProfile(data as unknown as Record<string, unknown>)
  localStorage.setItem(PROFILE_KEY, JSON.stringify(clean))
  return clean
}

// === Diaries ===

const DIARIES_KEY = 'enterprise-diary-entries'

// 旧版本（四字段时代）数据迁移为三字段结构
function migrateDiary(raw: Record<string, unknown>): DiaryEntry {
  return {
    id: (raw.id as string) || crypto.randomUUID(),
    date: (raw.date as string) || '',
    position: (raw.position as string) || 'PQE',
    // 新字段优先；否则用旧字段回退：content ← generated_content 或 today_work
    content:
      (raw.content as string) ||
      (raw.generated_content as string) ||
      (raw.today_work as string) ||
      '',
    feelings:
      (raw.feelings as string) ||
      (raw.generated_feelings as string) ||
      (raw.learn_content as string) ||
      '',
    other:
      (raw.other as string) ||
      (raw.generated_other as string) ||
      (raw.thinking as string) ||
      (raw.problems as string) ||
      '',
    created_at: (raw.created_at as string) || new Date().toISOString(),
  }
}

export async function getDiaries(): Promise<DiaryEntry[]> {
  try {
    const raw = localStorage.getItem(DIARIES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const migrated = parsed.map(migrateDiary)

    // 如果发生了迁移（旧数据），写回新格式
    const needWriteBack = parsed.some(
      (d: Record<string, unknown>) =>
        typeof d.content !== 'string' || typeof d.generated_content === 'string'
    )
    if (needWriteBack) {
      localStorage.setItem(DIARIES_KEY, JSON.stringify(migrated))
    }
    return migrated
  } catch {
    return []
  }
}

export async function insertDiary(
  data: Omit<DiaryEntry, 'id' | 'created_at'>
): Promise<DiaryEntry> {
  const diaries = await getDiaries()
  const entry: DiaryEntry = {
    ...data,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  }
  diaries.unshift(entry) // 最新在前
  localStorage.setItem(DIARIES_KEY, JSON.stringify(diaries))
  return entry
}

export async function deleteDiary(id: string): Promise<void> {
  const diaries = await getDiaries()
  const filtered = diaries.filter(d => d.id !== id)
  localStorage.setItem(DIARIES_KEY, JSON.stringify(filtered))
}

// === 批量写入（供备份恢复使用） ===

// 覆盖式写入
export async function replaceDiaries(list: DiaryEntry[]): Promise<void> {
  localStorage.setItem(DIARIES_KEY, JSON.stringify(list))
}

// 合并式写入：按 id 去重，已存在的跳过；结果按 created_at 倒序
export async function mergeDiaries(
  list: DiaryEntry[]
): Promise<{ added: number; skipped: number }> {
  const existing = await getDiaries()
  const seen = new Set(existing.map(d => d.id))
  let added = 0
  let skipped = 0

  for (const item of list) {
    if (seen.has(item.id)) {
      skipped++
      continue
    }
    seen.add(item.id)
    existing.push(item)
    added++
  }

  existing.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
  localStorage.setItem(DIARIES_KEY, JSON.stringify(existing))
  return { added, skipped }
}

// === 草稿（自动保存，防刷新/崩溃丢失） ===

const DRAFT_KEY = 'enterprise-diary-draft'

export async function getDraft(): Promise<DraftState | null> {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return null

    const f = (data as Record<string, unknown>).form
    if (!f || typeof f !== 'object') return null
    const form = f as Record<string, unknown>

    const rawResult = (data as Record<string, unknown>).aiResult
    let aiResult: AIGeneratedResult | null = null
    if (rawResult && typeof rawResult === 'object') {
      const r = rawResult as Record<string, unknown>
      aiResult = {
        content: typeof r.content === 'string' ? r.content : '',
        feelings: typeof r.feelings === 'string' ? r.feelings : '',
        other: typeof r.other === 'string' ? r.other : '',
      }
    }

    return {
      form: {
        date: typeof form.date === 'string' ? form.date : '',
        position: typeof form.position === 'string' ? form.position : '',
        content: typeof form.content === 'string' ? form.content : '',
        feelings: typeof form.feelings === 'string' ? form.feelings : '',
        other: typeof form.other === 'string' ? form.other : '',
      },
      aiResult,
      updatedAt:
        typeof (data as Record<string, unknown>).updatedAt === 'string'
          ? ((data as Record<string, unknown>).updatedAt as string)
          : '',
    }
  } catch {
    return null
  }
}

// 三段草稿与生成结果都为空时，直接清掉草稿，避免下次恢复出一个空表单
export async function saveDraft(
  form: DiaryFormInput,
  aiResult: AIGeneratedResult | null
): Promise<void> {
  const isEmpty =
    !form.content.trim() && !form.feelings.trim() && !form.other.trim() && !aiResult
  if (isEmpty) {
    localStorage.removeItem(DRAFT_KEY)
    return
  }
  const draft: DraftState = { form, aiResult, updatedAt: new Date().toISOString() }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

export async function clearDraft(): Promise<void> {
  localStorage.removeItem(DRAFT_KEY)
}
