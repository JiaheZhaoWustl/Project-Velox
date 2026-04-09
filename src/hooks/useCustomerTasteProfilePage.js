import { useState, useEffect, useCallback } from 'react'
import { DEFAULT_PREFS } from '../constants/tasteProfile'
import { tasteProfileApi, recommendationsApi, customerApi } from '../services/api'

function readLocalJson(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Taste profile page: preferences, cached recommendations, and refresh-from-GPT flow.
 */
export function useCustomerTasteProfilePage() {
  const [preferences, setPreferences] = useState(DEFAULT_PREFS)
  const [userName] = useState('Guest')
  const [recommendations, setRecommendations] = useState(null)
  const [selectedRecIndex, setSelectedRecIndex] = useState(0)
  const [isUpdatingRecommendations, setIsUpdatingRecommendations] = useState(false)
  const [recommendationsError, setRecommendationsError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      try {
        const profileId = localStorage.getItem('customerTasteProfileId')
        const data = profileId
          ? await tasteProfileApi.get(profileId).catch(() => ({}))
          : await tasteProfileApi.getLatest().catch(() => ({}))
        if (cancelled) return
        if (data?.success && data.profile) {
          setPreferences((p) => ({ ...p, ...data.profile }))
          if (data.profile.id) localStorage.setItem('customerTasteProfileId', data.profile.id)
        } else {
          const parsed = readLocalJson('customerTasteProfile')
          if (parsed) setPreferences((p) => ({ ...p, ...parsed }))
        }
      } catch {
        const parsed = readLocalJson('customerTasteProfile')
        if (parsed && !cancelled) setPreferences((p) => ({ ...p, ...parsed }))
      }

      const recs = readLocalJson('cocktailRecommendations')
      if (recs && !cancelled) setRecommendations(recs)
    }

    loadProfile()
    return () => {
      cancelled = true
    }
  }, [])

  const savePreferences = useCallback((next) => {
    setPreferences(next)
    localStorage.setItem('customerTasteProfile', JSON.stringify(next))
  }, [])

  const handleUpdateRecommendations = useCallback(async () => {
    setRecommendationsError(null)
    setIsUpdatingRecommendations(true)
    try {
      const saveData = await tasteProfileApi.save(preferences).catch(() => ({}))
      if (saveData?.success && saveData.id) {
        localStorage.setItem('customerTasteProfileId', saveData.id)
        customerApi.setTasteProfileId(saveData.id).catch(() => {})
      }
      const data = await recommendationsApi.get({ customer_taste_profile: preferences })
      localStorage.setItem('cocktailRecommendations', JSON.stringify(data.recommendations))
      setRecommendations(data.recommendations)
      setSelectedRecIndex(0)
    } catch (err) {
      setRecommendationsError(err.message || 'Could not update recommendations')
    } finally {
      setIsUpdatingRecommendations(false)
    }
  }, [preferences])

  return {
    preferences,
    savePreferences,
    userName,
    recommendations,
    selectedRecIndex,
    setSelectedRecIndex,
    isUpdatingRecommendations,
    recommendationsError,
    handleUpdateRecommendations,
  }
}
