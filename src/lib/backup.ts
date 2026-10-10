// ============================================================
// 数据备份与恢复
// 背景：日记全部存于 localStorage，浏览器清理数据即全部丢失，
// 因此必须提供导出/导入通道。
// ============================================================

import { saveAs } from 'file-saver'
import type { AIConfig } from './aiConfig'
import type { DiaryEntry, Profile } from '../types'
import { getDiaries, getProfile, mergeDiaries, replaceDiaries, saveProfile } from './storage'
import { getAIConfig, saveAIConfig } from './aiConfig'

export const BACKUP_VERSION = 1
export const BACKUP_APP_ID = 'enterprise-diary'

export interface BackupPayload {
  app: typeof BACKUP_APP_ID
  version: number
  exportedAt: string
  profile: Profile | null
  diaries: DiaryEntry[]
  aiConfig: AIConfig | null
}

export async function createBackup(): Promise<BackupPayload> {
  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    profile: await getProfile(),
    diaries: await getDiaries(),
    aiConfig: getAIConfig(),
  }
}

export type ValidationResult =
  | { ok: true; payload: BackupPayload }
  | { ok: false; error: string }

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

// 校验并规范化外部传入的备份数据，绝不信任其结构
export function validateBackup(raw: unknown): ValidationResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: '文件内容不是有效的备份对象' }
  }
  const obj = raw as Record<string, unknown>

  if (obj.app !== BACKUP_APP_ID) {
    return { ok: false, error: '这不是「企业实践日记」的备份文件' }
  }
  if (typeof obj.version !== 'number' || Number.isNaN(obj.version)) {
    return { ok: false, error: '备份文件缺少版本号' }
  }
  if (obj.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `备份文件版本（v${obj.version}）高于当前应用支持的版本（v${BACKUP_VERSION}），请先升级应用`,
    }
  }
  if (!Array.isArray(obj.diaries)) {
    return { ok: false, error: '备份文件缺少日记列表' }
  }

  const diaries: DiaryEntry[] = obj.diaries
    .filter((d): d is Record<string, unknown> => typeof d === 'object' && d !== null)
    .map(d => ({
      id: asString(d.id) || crypto.randomUUID(),
      date: asString(d.date),
      position: asString(d.position),
      content: asString(d.content),
      feelings: asString(d.feelings),
      other: asString(d.other),
      created_at: asString(d.created_at) || new Date().toISOString(),
    }))

  const rawProfile = obj.profile
  const profile =
    rawProfile && typeof rawProfile === 'object' && !Array.isArray(rawProfile)
      ? (rawProfile as Profile)
      : null

  const rawAi = obj.aiConfig
  const aiConfig =
    rawAi && typeof rawAi === 'object' && !Array.isArray(rawAi) ? (rawAi as AIConfig) : null

  return {
    ok: true,
    payload: {
      app: BACKUP_APP_ID,
      version: obj.version,
      exportedAt: asString(obj.exportedAt),
      profile,
      diaries,
      aiConfig,
    },
  }
}

export function parseBackupFile(text: string): ValidationResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: '文件不是合法的 JSON' }
  }
  return validateBackup(raw)
}

export type ImportMode = 'merge' | 'replace'

export interface ImportSummary {
  added: number
  skipped: number
  profileRestored: boolean
  aiConfigRestored: boolean
}

function hasContent(profile: Profile | null): boolean {
  if (!profile) return false
  return Object.values(profile).some(v => String(v ?? '').trim())
}

export async function applyBackup(
  payload: BackupPayload,
  mode: ImportMode
): Promise<ImportSummary> {
  let added = 0
  let skipped = 0

  if (mode === 'replace') {
    await replaceDiaries(payload.diaries)
    added = payload.diaries.length
  } else {
    const r = await mergeDiaries(payload.diaries)
    added = r.added
    skipped = r.skipped
  }

  // 备份里的个人信息全为空时不覆盖当前信息
  const profileRestored = hasContent(payload.profile)
  if (profileRestored && payload.profile) {
    await saveProfile(payload.profile)
  }

  const aiConfigRestored = Boolean(payload.aiConfig && payload.aiConfig.apiUrl)
  if (aiConfigRestored && payload.aiConfig) {
    saveAIConfig(payload.aiConfig)
  }

  return { added, skipped, profileRestored, aiConfigRestored }
}

export async function downloadBackup(): Promise<string> {
  const payload = await createBackup()
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const name = `企业实践日记_备份_${stamp}.json`
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  saveAs(blob, name)
  return name
}
