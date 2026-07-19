-- ============================================
-- 企业实践日记 AI 助手 - Supabase Schema
-- ============================================

-- 1. 个人信息表
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  student_id TEXT NOT NULL DEFAULT '',
  class_name TEXT NOT NULL DEFAULT '',
  college TEXT NOT NULL DEFAULT '管理工程与科学',
  major TEXT NOT NULL DEFAULT '质量管理工程',
  teacher TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '余姚舜宇智能光学技术有限公司',
  company_teacher TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 日记表
CREATE TABLE IF NOT EXISTS diaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date TEXT NOT NULL DEFAULT '',           -- e.g. "7.17"
  position TEXT NOT NULL DEFAULT 'PQE',    -- 实习岗位
  -- 用户输入
  today_work TEXT NOT NULL DEFAULT '',
  learn_content TEXT NOT NULL DEFAULT '',
  problems TEXT NOT NULL DEFAULT '',
  thinking TEXT NOT NULL DEFAULT '',
  -- AI 生成
  generated_content TEXT NOT NULL DEFAULT '',
  generated_feelings TEXT NOT NULL DEFAULT '',
  generated_other TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_diaries_profile_id ON diaries(profile_id);
CREATE INDEX IF NOT EXISTS idx_diaries_date ON diaries(date);

-- 更新触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trig_diaries_updated_at
  BEFORE UPDATE ON diaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 行级安全（可选，单用户工具不需要严格 RLS）
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE diaries ENABLE ROW LEVEL SECURITY;

-- 允许所有操作（单用户模式）
CREATE POLICY profiles_all ON profiles
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY diaries_all ON diaries
  FOR ALL USING (true) WITH CHECK (true);
