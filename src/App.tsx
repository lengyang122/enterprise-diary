import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import DiaryCreatePage from './pages/DiaryCreatePage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import WelcomePage from './pages/WelcomePage'
import { hasEntered } from './lib/storage'

// 首次打开先经过 /welcome 那个「假登录」页；走过一次就直接进主页。
// 标记存在 localStorage，设置页里可以重置重看。
function RequireEntry() {
  if (!hasEntered()) return <Navigate to="/welcome" replace />
  return <Layout />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 进入页自带背景，不套 Layout（没有侧边栏与底部导航） */}
        <Route path="/welcome" element={<WelcomePage />} />

        <Route path="/" element={<RequireEntry />}>
          <Route index element={<DiaryCreatePage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
