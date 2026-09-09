import { Navigate, Route, Routes } from 'react-router-dom'
import { NewTaskPage } from '../features/tour-tasks/new-task-page'
import { TourTaskListPage } from '../features/tour-tasks/tour-task-list-page'
import { MapsPage, PersonasPage, PluginsPage } from '../pages/empty-feature-page'
import { RuntimePage } from '../pages/runtime-page'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/tour-tasks" element={<TourTaskListPage />} />
      <Route path="/tour-tasks/new" element={<NewTaskPage />} />
      <Route path="/maps" element={<MapsPage />} />
      <Route path="/voice/personas" element={<PersonasPage />} />
      <Route path="/voice/plugins" element={<PluginsPage />} />
      <Route path="/runtime" element={<RuntimePage />} />
      <Route path="*" element={<Navigate to="/tour-tasks" replace />} />
    </Routes>
  )
}
