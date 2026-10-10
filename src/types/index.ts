// === 用户个人信息 ===
export interface Profile {
  id: string
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
  created_at: string
  updated_at: string
}

// === 日记条目 ===
export interface DiaryEntry {
  id: string
  date: string
  position: string
  content: string       // 实习内容
  feelings: string      // 实习体会和感受
  other: string         // 其他
  created_at: string
}

// === 表单输入（用户每天填写的三个模块） ===
export interface DiaryFormInput {
  date: string
  position: string
  content: string    // 实习内容（原始草稿）
  feelings: string   // 实习体会和感受（原始草稿）
  other: string      // 其他（原始草稿）
}

// === AI 生成结果 ===
export interface AIGeneratedResult {
  content: string
  feelings: string
  other: string
}

// === 用于 Word 生成的数据 ===
export interface DiaryWordData {
  // 固定信息
  name: string
  student_id: string
  class_name: string
  college: string
  teacher: string
  company: string
  company_teacher: string
  start_date: string
  end_date: string
  
  // 日记内容
  date: string
  position: string
  content: string       // 实习内容
  feelings: string      // 实习体会和感受
  other: string         // 其他
}
