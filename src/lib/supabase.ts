import { createClient } from '@supabase/supabase-js'

// 从环境变量读取 Supabase 配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 辅助函数：获取或创建用户配置文件
export async function getOrCreateProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error && error.code === 'PGRST116') {
    // 不存在则创建默认配置
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        name: '',
        student_id: '',
        class_name: '',
        college: '',
        major: '质量管理工程',
        teacher: '',
        company: '',
        company_teacher: '',
        start_date: '',
        end_date: '',
      })
      .select()
      .single()

    if (createError) throw createError
    return newProfile
  }

  if (error) throw error
  return data
}

// 辅助函数：保存日记
export async function saveDiaryEntry(
  profileId: string,
  input: {
    date: string
    position: string
    today_work: string
    learn_content: string
    problems: string
    thinking: string
    generated_content: string
    generated_feelings: string
    generated_other: string
  }
) {
  const { data, error } = await supabase
    .from('diaries')
    .insert({
      profile_id: profileId,
      ...input,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// 辅助函数：获取日记列表
export async function getDiaryEntries(profileId: string) {
  const { data, error } = await supabase
    .from('diaries')
    .select('*')
    .eq('profile_id', profileId)
    .order('date', { ascending: false })

  if (error) throw error
  return data
}

// 辅助函数：更新日记
export async function updateDiaryEntry(
  id: string,
  updates: Partial<{
    today_work: string
    learn_content: string
    problems: string
    thinking: string
    generated_content: string
    generated_feelings: string
    generated_other: string
  }>
) {
  const { data, error } = await supabase
    .from('diaries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// 辅助函数：删除日记
export async function deleteDiaryEntry(id: string) {
  const { error } = await supabase
    .from('diaries')
    .delete()
    .eq('id', id)

  if (error) throw error
}
