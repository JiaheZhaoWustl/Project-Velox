import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ApiService from '../services/ApiService'

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const apiService = new ApiService()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setIsLoading(true)

    try {
      const result = await apiService.login(email, password)
      
      if (result.success) {
        localStorage.setItem('authToken', result.token)
        localStorage.setItem('userEmail', result.user.email)
        onLogin()
        navigate('/dashboard')
      } else {
        setError(result.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = () => {
    if (email) {
      alert(`Password reset link will be sent to ${email}`)
    } else {
      alert('Please enter your email address first')
    }
  }

  const handleSignUp = () => {
    alert('Sign up functionality coming soon!')
  }

  return (
    <div className="login-screen">
      <div className="login-container">
        {/* Left Panel: Login Form */}
        <div className="login-panel">
          <div className="login-content">
            <h1 className="welcome-title">
              Project Velox — staff
            </h1>
            <p className="welcome-subtitle">
              Sign in to manage inventory, menu, and sales.
            </p>
            
            <form className="login-form" onSubmit={handleSubmit}>
              {error && <div className="error-message">{error}</div>}
              
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@bar.com"
                  autoComplete="email"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-wrapper">
                  <input 
                    type={showPassword ? "text" : "password"}
                    id="password" 
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    required
                  />
                  <button 
                    type="button" 
                    className="password-toggle" 
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    <span className="toggle-text">{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn-login" disabled={isLoading}>
                  {isLoading ? 'Logging in...' : 'Log in'}
                </button>
                <a href="#" className="forgot-password" onClick={(e) => { e.preventDefault(); handleForgotPassword(); }}>
                  Forgot password?
                </a>
              </div>
            </form>
            
            <div className="signup-prompt">
              <p>New venue? Request access from your admin.</p>
              <a href="#" className="join-link" onClick={(e) => { e.preventDefault(); handleSignUp(); }}>Request access</a>
            </div>
          </div>
        </div>
        
        {/* Right Panel: Visual Element */}
        <div className="visual-panel">
          <div className="cocktail-image">
            <img 
              src="https://cdn.midjourney.com/0d33b900-d0af-40c4-9675-095083d81e78/0_0.png" 
              alt="Cocktail artwork" 
              className="cover-image"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
