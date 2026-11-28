export const DEFAULT_DASHBOARD_PREFERENCES = {
  showSubjects: true,
  showRecentFiles: true,
  recentFileLimit: 5,
}

const STORAGE_KEY = 'studyVault.dashboardPreferences'

export const readDashboardPreferences = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return { ...DEFAULT_DASHBOARD_PREFERENCES }

  const value = JSON.parse(saved)
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Saved dashboard preferences are invalid')
  }
  if (
    typeof value.showSubjects !== 'boolean'
    || typeof value.showRecentFiles !== 'boolean'
    || !Number.isInteger(value.recentFileLimit)
    || value.recentFileLimit < 3
    || value.recentFileLimit > 10
  ) {
    throw new TypeError('Saved dashboard preferences are invalid')
  }

  return value
}

export const writeDashboardPreferences = (preferences) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
}
