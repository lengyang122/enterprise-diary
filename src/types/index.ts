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
  profile_id: string
  date: string          // 日期 "7.17"
  position: string      // 实习岗位（默认 PQE）
  
  // 用户输入
  today_work: string    // 今日工作
  learn_content: string // 学习内容
  problems: string      // 发现问题
  thinking: string      // 思考
  
  // AI 生成
  generated_content: string   // 实习内容
  generated_feelings: string  // 实习体会和感受
  generated_other: string     // 其他
  
  created_at: string
  updated_at: string
}

// === 表单输入（用户每天填写的） ===
export interface DiaryFormInput {
  date: string
  position: string
  today_work: string
  learn_content: string
  problems: string
  thinking: string
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
