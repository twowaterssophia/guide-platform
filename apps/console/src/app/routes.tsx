import { Navigate, Route, Routes } from 'react-router-dom'
import { NewTaskPage } from '../features/tour-tasks/new-task-page'
import { TourTaskDetailPage } from '../features/tour-tasks/tour-task-detail-page'
import { TourTaskListPage } from '../features/tour-tasks/tour-task-list-page'
import { PersonaDetailPage } from '../features/personas/persona-detail-page'
import { PersonaFormPage } from '../features/personas/persona-form-page'
import { PersonaListPage } from '../features/personas/persona-list-page'
import { MapDetailPage } from '../features/maps/map-detail-page'
import { MapListPage } from '../features/maps/map-list-page'
import { PluginDetailPage } from '../features/plugins/plugin-detail-page'
import { PluginFormPage } from '../features/plugins/plugin-form-page'
import { PluginsPage } from '../features/plugins/plugins-page'
import { RobotConsolePage } from '../features/robots/robot-console-page'
import { KnowledgeBasesPage } from '../features/knowledge-bases/knowledge-bases-page'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/tour-tasks" element={<TourTaskListPage />} />
      <Route path="/tour-tasks/new" element={<NewTaskPage />} />
      <Route path="/tour-tasks/:taskId/edit" element={<NewTaskPage />} />
      <Route path="/tour-tasks/:taskId" element={<TourTaskDetailPage />} />
      <Route path="/robots" element={<RobotConsolePage />} />
      <Route path="/robots/:robotId" element={<RobotConsolePage />} />
      <Route path="/maps" element={<MapListPage />} />
      <Route path="/maps/:mapId" element={<MapDetailPage />} />
      <Route path="/knowledge-bases" element={<KnowledgeBasesPage />} />
      <Route path="/voice/personas" element={<PersonaListPage />} />
      <Route path="/voice/personas/new" element={<PersonaFormPage />} />
      <Route path="/voice/personas/:personaId" element={<PersonaDetailPage />} />
      <Route path="/voice/personas/:personaId/edit" element={<PersonaFormPage />} />
      <Route path="/voice/plugins" element={<PluginsPage />} />
      <Route path="/voice/plugins/new" element={<PluginFormPage />} />
      <Route path="/voice/plugins/:pluginId" element={<PluginDetailPage />} />
      <Route path="/voice/plugins/:pluginId/edit" element={<PluginFormPage />} />
      <Route path="*" element={<Navigate to="/tour-tasks" replace />} />
    </Routes>
  )
}
