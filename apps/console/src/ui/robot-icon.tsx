import { createLucideIcon } from 'lucide-react'

export const RobotIcon = createLucideIcon('Robot', [
  ['rect', { x: '4', y: '6', width: '16', height: '14', rx: '3', key: 'head' }],
  ['path', { d: 'M2 12h2M20 12h2M9 11v3M15 11v3', key: 'ears-and-eyes' }],
])
