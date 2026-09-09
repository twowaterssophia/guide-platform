export interface LegacyMigrationMapBindings {
  [legacyMapId: string]: string
}

export interface LegacyMigrationOptions {
  mapBindings?: LegacyMigrationMapBindings
}

export type LegacyMigrationIssueLevel = 'error' | 'warning'

export interface LegacyMigrationIssue {
  level: LegacyMigrationIssueLevel
  code: string
  path: string
  message: string
}

export interface LegacyMigrationReport {
  ready: boolean
  sourceVersion: number | null
  issues: LegacyMigrationIssue[]
  summary: {
    mapsInSource: number
    mapsBound: number
    pluginsToCreate: number
    personasToCreate: number
    personasReused: number
    tasksToCreate: number
    pointsToCreate: number
    pathsToCreate: number
    actionsToCreate: number
  }
  mapBindings: LegacyMigrationMapBindings
}

export interface LegacyMigrationResult {
  imported: {
    plugins: number
    personas: number
    tasks: number
    points: number
    paths: number
    actions: number
  }
  mapBindings: LegacyMigrationMapBindings
}
