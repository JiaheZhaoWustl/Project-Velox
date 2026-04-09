import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { combinePhoneForRegister } from '../utils/phone'
import { clearGuestPhone } from '../utils/customerSession'
import ApiService from '../services/ApiService'
import coverImage from '../../assets/midj_cover.png'

const PHONE_COPY =
  'Enter your phone number for a personalized experience — recommendations, order history, and saved favorites.'

function CustomerLogin({ onStaffLogin }) {
  const [phone, setPhone] = useState('')
  const [prefix, setPrefix] = useState('+1')
  const [staffCode, setStaffCode] = useState('')
  const [showStaffLogin, setShowStaffLogin] = useState(false)
  const [staffError, setStaffError] = useState('')
  const [staffLoading, setStaffLoading] = useState(false)
  const navigate = useNavigate()

  const handlePhoneContinue = (e) => {
    e.preventDefault()
    const { display } = combinePhoneForRegister(prefix, phone)
    if (display.trim()) {
      localStorage.setItem('customerPhone', display.trim())
    } else {
      localStorage.removeItem('customerPhone')
    }
    navigate('/customer/onboarding')
  }

  const handleGuestContinue = () => {
    clearGuestPhone()
    localStorage.removeItem('customerPhone')
    navigate('/customer/onboarding')
  }

  const handleStaffLogin = async (e) => {
    e.preventDefault()
    setStaffError('')

    if (!staffCode.trim()) {
      setStaffError('Please enter the staff access code')
      return
    }

    setStaffLoading(true)
    try {
      const apiService = new ApiService()
      const result = await apiService.loginWithCode(staffCode.trim())
      if (result.success) {
        localStorage.setItem('authToken', result.token)
        localStorage.setItem('userEmail', result.user.email)
        onStaffLogin()
        navigate('/dashboard')
      } else {
        setStaffError(result.message || 'Invalid access code')
      }
    } catch {
      setStaffError('Login failed. Please try again.')
    } finally {
      setStaffLoading(false)
    }
  }

  return (
    <div className="customer-login-screen">
      <div className="customer-login-container">
        <div className="customer-login-panel">
          <div className="customer-login-content">
            <h1 className="customer-welcome-title">
              Welcome to <i>Project Velox</i>.
            </h1>
            <p className="customer-welcome-subtitle">{PHONE_COPY}</p>

            {/* Phone login */}
            <form className="customer-login-form" onSubmit={handlePhoneContinue}>
              <div className="customer-form-group">
                <label htmlFor="phone">Phone</label>
                <div className="customer-phone-input-wrap">
                  <select
                    className="customer-phone-prefix"
                    aria-label="Country code"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                  >
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+49">🇩🇪 +49</option>
                    <option value="+81">🇯🇵 +81</option>
                    <option value="+86">🇨🇳 +86</option>
                  </select>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="5551234567"
                    autoComplete="tel"
                    className="customer-phone-input"
                  />
                </div>
              </div>
              <button type="submit" className="customer-btn-continue">
                Continue
              </button>
            </form>

            {/* Separator */}
            <div className="customer-login-separator">
              <span>or</span>
            </div>

            {/* Guest login */}
            <button
              type="button"
              className="customer-btn-guest"
              onClick={handleGuestContinue}
            >
              Continue as Guest
            </button>

            {/* Staff access */}
            <div className="customer-staff-section">
              {!showStaffLogin ? (
                <button
                  type="button"
                  className="customer-staff-toggle"
                  onClick={() => setShowStaffLogin(true)}
                >
                  Staff access
                </button>
              ) : (
                <form className="customer-staff-form" onSubmit={handleStaffLogin}>
                  <div className="customer-staff-header">
                    <span className="customer-staff-label">Staff login</span>
                    <button
                      type="button"
                      className="customer-staff-close"
                      onClick={() => { setShowStaffLogin(false); setStaffError('') }}
                      aria-label="Close staff login"
                    >
                      &times;
                    </button>
                  </div>
                  {staffError && (
                    <div className="customer-login-error">{staffError}</div>
                  )}
                  <input
                    type="password"
                    className="customer-staff-code-input"
                    value={staffCode}
                    onChange={(e) => setStaffCode(e.target.value)}
                    placeholder="Enter access code"
                    autoComplete="off"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="customer-btn-continue"
                    disabled={staffLoading}
                  >
                    {staffLoading ? 'Signing in…' : 'Sign in as Staff'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="customer-login-visual">
          <img
            src={coverImage}
            alt="Cocktail artwork"
            className="customer-login-cover"
          />
        </div>
      </div>
    </div>
  )
}

export default CustomerLogin
