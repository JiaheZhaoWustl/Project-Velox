/**
 * Shared taste profile actions. Use with either:
 * - setPreferences from useState: updatePreferences = (next) => setPreferences(next)
 * - savePreferences (localStorage + state): updatePreferences = savePreferences
 */
export function useTasteProfileActions(preferences, updatePreferences) {
  const toggleAroma = (a) => {
    const arr = preferences.aromas?.includes(a)
      ? preferences.aromas.filter((x) => x !== a)
      : [...(preferences.aromas || []), a]
    if (arr.length > 3) arr.shift()
    updatePreferences({ ...preferences, aromas: arr })
  }

  const toggleFeeling = (f) => {
    const arr = preferences.feelings?.includes(f)
      ? preferences.feelings.filter((x) => x !== f)
      : [...(preferences.feelings || []), f]
    updatePreferences({ ...preferences, feelings: arr })
  }

  return { toggleAroma, toggleFeeling }
}
