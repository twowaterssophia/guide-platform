import { Navigate, Route, Routes } from 'react-router-dom'
import { NewTaskPage } from '../features/tour-tasks/new-task-page'
import { TourTaskDetailPage } from '../features/tour-tasks/tour-task-detail-page'
import { TourTaskListPage } from '../features/tour-tasks/tour-task-list-page'
import { PersonaDetailPage } from '../features/personas/persona-detail-page'
import { PersonaFormPage } from '../features/personas/persona-form-page'
import { PersonaListPage } from '../features/personas/persona-list-page'
import { MapDetailPage } from '../features/maps/map-detail-page'
import { MapListPage } from '../features/maps/map-list-page'
import { PluginsPage } from '../pages/empty-feature-page'
import { RuntimePage } from '../pages/runtime-page'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/tour-tasks" element={<TourTaskListPage />} />
      <Route path="/tour-tasks/new" element={<NewTaskPage />} />
      <Route path="/tour-tasks/:taskId/edit" element={<NewTaskPage />} />
      <Route path="/tour-tasks/:taskId" element={<TourTaskDetailPage />} />
      <Route path="/maps" element={<MapListPage />} />
      <Route path="/maps/:mapId" element={<MapDetailPage />} />
      <Route path="/voice/personas" element={<PersonaListPage />} />
      <Route path="/voice/personas/new" element={<PersonaFormPage />} />
      <Route path="/voice/personas/:personaId" element={<PersonaDetailPage />} />
      <Route path="/voice/personas/:personaId/edit" element={<PersonaFormPage />} />
      <Route path="/voice/plugins" element={<PluginsPage />} />
      <Route path="/runtime" element={<RuntimePage />} />
      <Route path="*" element={<Navigate to="/tour-tasks" replace />} />
    </Routes>
  )
}
