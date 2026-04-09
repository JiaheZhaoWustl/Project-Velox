class ApiService {
  constructor() {
    this.baseUrl = '/api'
    this.mockMode = true
  }

  async login(email, password) {
    if (this.mockMode) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return {
        success: true,
        token: 'mock_token_' + Date.now(),
        user: { email, name: 'Demo User' }
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      return await response.json()
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  async loginWithCode(code) {
    if (this.mockMode) {
      await new Promise(resolve => setTimeout(resolve, 800))
      const validCode = 'velox2025'
      if (code === validCode) {
        return {
          success: true,
          token: 'staff_token_' + Date.now(),
          user: { email: 'staff@projectvelox.com', name: 'Staff' }
        }
      }
      return { success: false, message: 'Invalid access code' }
    }

    try {
      const response = await fetch(`${this.baseUrl}/login/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      return await response.json()
    } catch (error) {
      console.error('Code login error:', error)
      throw error
    }
  }

  async getCocktailRecommendations(preferences) {
    if (this.mockMode) {
      await new Promise(resolve => setTimeout(resolve, 1500))
      return {
        success: true,
        recommendations: [
          { name: 'Classic Mojito', ingredients: ['Rum', 'Mint', 'Lime', 'Soda'] },
          { name: 'Old Fashioned', ingredients: ['Whiskey', 'Sugar', 'Bitters', 'Orange'] }
        ]
      }
    }
    
    // Future: AI/LLM call for cocktail recommendations
    try {
      const response = await fetch(`${this.baseUrl}/cocktails/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences })
      })
      return await response.json()
    } catch (error) {
      console.error('Recommendation error:', error)
      throw error
    }
  }
}

export default ApiService
