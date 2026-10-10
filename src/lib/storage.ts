// 本地存储层 — 全部数据存 localStorage，无需 Supabase
// 含旧版本数据迁移：自动识别四字段时代的旧数据并转换为新三字段结构

// === Profile ===

const PROFILE_KEY = 'enterprise-diary-profile'

export interface ProfileRow {
  name: string
  student_id: string
  class_name: string
  college: string
  major: string
  teacher: string
  company: string
  company_teacher: string
  start_date: string
  end_date: string
}

export async function getProfile(): Promise<ProfileRow | null> {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    // 防御：保证字段存在
    return {
      name: data.name || '',
      student_id: data.student_id || '',
      class_name: data.class_name || '',
      college: data.college || '',
      major: data.major || '',
      teacher: data.teacher || '',
      company: data.company || '',
      company_teacher: data.company_teacher || '',
      start_date: data.start_date || '',
      end_date: data.end_date || '',
    }
  } catch {
    return null
  }
}

export async function saveProfile(data: ProfileRow): Promise<ProfileRow> {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data))
  return data
}

// === Diaries ===

const DIARIES_KEY = 'enterprise-diary-entries'

export interface DiaryRow {
  id: string
  date: string
  position: string
  content: string
  feelings: string
  other: string
  created_at: string
}

// 旧版本（四字段时代）数据迁移为三字段结构
function migrateDiary(raw: Record<string, unknown>): DiaryRow {
  return {
    id: (raw.id as string) || crypto.randomUUID(),
    date: (raw.date as string) || '',
    position: (raw.position as string) || 'PQE',
    // 新字段优先；否则用旧字段回退：content ← generated_content 或 today_work
    content: (raw.content as string) || (raw.generated_content as string) || (raw.today_work as string) || '',
    feelings: (raw.feelings as string) || (raw.generated_feelings as string) || (raw.learn_content as string) || '',
    other: (raw.other as string) || (raw.generated_other as string) || (raw.thinking as string) || (raw.problems as string) || '',
    created_at: (raw.created_at as string) || new Date().toISOString(),
  }
}

export async function getDiaries(): Promise<DiaryRow[]> {
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

export async function insertDiary(data: Omit<DiaryRow, 'id' | 'created_at'>): Promise<DiaryRow> {
  const diaries = await getDiaries()
  const entry: DiaryRow = {
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

// === AI 配置（独立 key） ===

const AI_CONFIG_KEY = 'enterprise-diary-ai-config'

export interface AIConfigRow {
  apiKey: string
  apiUrl: string
  model: string
}

const DEFAULT_AI: AIConfigRow = {
  apiKey: '',
  apiUrl: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-v4-flash',
}

export async function getAIConfig(): Promise<AIConfigRow> {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY)
    if (!raw) return { ...DEFAULT_AI }
    const data = JSON.parse(raw)
    return {
      apiKey: data.apiKey || '',
      apiUrl: data.apiUrl || DEFAULT_AI.apiUrl,
      model: data.model || DEFAULT_AI.model,
    }
  } catch {
    return { ...DEFAULT_AI }
  }
}

export async function saveAIConfig(config: AIConfigRow): Promise<void> {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config))
}
