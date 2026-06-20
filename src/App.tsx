import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import RecordingPage from './pages/RecordingPage'
import ScriptEditorPage from './pages/ScriptEditorPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/script/new" element={<ScriptEditorPage />} />
        <Route path="/script/:id" element={<ScriptEditorPage />} />
        <Route path="/record/:id" element={<RecordingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
