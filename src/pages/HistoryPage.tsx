import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { downloadWord } from '../lib/word'
import type { Profile, DiaryEntry } from '../types'

const PROFILE_ID_KEY = 'enterprise-diary-profile-id'

export default function HistoryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const storedId = localStorage.getItem(PROFILE_ID_KEY)
    if (!storedId) {
      setLoading(false)
      return
    }

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', storedId)
      .single()
    if (prof) setProfile(prof)

    const { data: diaries } = await supabase
      .from('diaries')
      .select('*')
      .eq('profile_id', storedId)
      .order('date', { ascending: false })
    
    if (diaries) setEntries(diaries)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('确定要删除这条日记吗？')) return
    setDeleting(id)
    await supabase.from('diaries').delete().eq('id', id)
    setEntries(entries.filter(e => e.id !== id))
    setDeleting(null)
    if (selectedEntry?.id === id) setSelectedEntry(null)
  }

  async function handleDownload(entry: DiaryEntry) {
    if (!profile) return
    await downloadWord({
      name: profile.name,
      student_id: profile.student_id,
      class_name: profile.class_name,
      college: profile.college,
      teacher: profile.teacher,
      company: profile.company,
      company_teacher: profile.company_teacher,
      start_date: profile.start_date,
      end_date: profile.end_date,
      date: entry.date,
      position: entry.position,
      content: entry.generated_content,
      feelings: entry.generated_feelings,
      other: entry.generated_other,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">📚 历史记录</h2>
        <p className="text-sm text-notion-text-secondary mt-1">
          共 {entries.length} 篇日记
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-notion-text-secondary">
          加载中...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 text-notion-text-secondary">
          <p className="text-4xl mb-4">📝</p>
          <p>还没有日记记录</p>
          <p className="text-sm mt-1">去"新建日记"开始你的第一篇企业实践日记吧</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {/* 列表 */}
          <div className="col-span-1 space-y-2">
            {entries.map(entry => (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className={`w-full text-left p-3 rounded-md border transition-colors ${
                  selectedEntry?.id === entry.id
                    ? 'border-notion-accent bg-blue-50'
                    : 'border-notion-border bg-notion-card hover:bg-notion-hover'
                }`}
              >
                <div className="text-sm font-medium">
                  {entry.date}
                  <span className="text-notion-text-secondary ml-2 font-normal">
                    {entry.position}
                  </span>
                </div>
                <p className="text-xs text-notion-text-secondary mt-1 truncate">
                  {entry.today_work}
                </p>
                <p className="text-xs text-notion-text-secondary mt-1">
                  {new Date(entry.created_at).toLocaleDateString('zh-CN')}
                </p>
              </button>
            ))}
          </div>

          {/* 详情 */}
          <div className="col-span-2">
            {selectedEntry ? (
              <div className="bg-notion-card rounded-lg border border-notion-border p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">
                      {selectedEntry.date}
                      <span className="text-notion-text-secondary text-sm ml-2 font-normal">
                        {selectedEntry.position}
                      </span>
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(selectedEntry)}
                      className="px-3 py-1.5 text-sm border border-notion-border rounded-md hover:bg-notion-hover transition-colors"
                    >
                      📄 下载
                    </button>
                    <button
                      onClick={() => handleDelete(selectedEntry.id)}
                      disabled={deleting === selectedEntry.id}
                      className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      🗑️ 删除
                    </button>
                  </div>
                </div>

                {/* 用户原始输入 */}
                <div className="bg-notion-bg rounded-md p-3 text-sm space-y-2">
                  <p><span className="font-medium">今日工作：</span>{selectedEntry.today_work}</p>
                  <p><span className="font-medium">学习内容：</span>{selectedEntry.learn_content}</p>
                  <p><span className="font-medium">发现问题：</span>{selectedEntry.problems}</p>
                  <p><span className="font-medium">思考：</span>{selectedEntry.thinking}</p>
                </div>

                {/* 生成内容 */}
                <div className="space-y-3">
                  <div className="bg-blue-50 rounded-md p-4">
                    <h4 className="text-sm font-medium text-notion-accent mb-2">实习内容</h4>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedEntry.generated_content}</p>
                  </div>
                  <div className="bg-green-50 rounded-md p-4">
                    <h4 className="text-sm font-medium text-green-700 mb-2">实习体会和感受</h4>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedEntry.generated_feelings}</p>
                  </div>
                  <div className="bg-purple-50 rounded-md p-4">
                    <h4 className="text-sm font-medium text-purple-700 mb-2">其他</h4>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedEntry.generated_other}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-notion-card rounded-lg border border-notion-border p-12 text-center text-notion-text-secondary">
                <p className="text-4xl mb-4">👆</p>
                <p>从左侧选择一篇日记查看详情</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
