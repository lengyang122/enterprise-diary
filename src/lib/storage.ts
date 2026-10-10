// ============================================================
// 本地存储层 — 全部数据存 localStorage，无后端
// 含旧版本数据迁移：
//   Profile：忽略历史遗留的 id / created_at / updated_at
//   Diary  ：自动识别四字段时代的旧数据并转换为新三字段结构
// ============================================================

import type { Profile, DiaryEntry } from '../types'

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
