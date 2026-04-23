import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Sales from './pages/Sales'
import Reports from './pages/Reports'
import Menu from './pages/Menu'
import Settings from './pages/Settings'
import Publish from './pages/Publish'
import CustomerLogin from './pages/CustomerLogin'
import CustomerOnboarding from './pages/CustomerOnboarding'
import CustomerMenu from './pages/CustomerMenu'
import CustomerTasteProfile from './pages/CustomerTasteProfile'
import CustomerCollection from './pages/CustomerCollection'
import CustomerOrderHistory from './pages/CustomerOrderHistory'
import SplashScreen from './pages/SplashScreen'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const authToken = localStorage.getItem('authToken')
    setIsAuthenticated(!!authToken)
    setLoading(false)
  }, [])

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userEmail')
    setIsAuthenticated(false)
  }

  if (loading) {
    return <div className="app-boot">Loading…</div>
  }

  return (
    <Router>
      <Routes>
        {/* Unified login — all roles enter here */}
        <Route
          path="/customer"
          element={<CustomerLogin onStaffLogin={handleLogin} />}
        />

        {/* Legacy /login redirects to unified login */}
        <Route
          path="/login"
          element={
            isAuthenticated
              ? <Navigate to="/dashboard" replace />
              : <Navigate to="/customer" replace />
          }
        />

        {/* Staff pages — require auth */}
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/customer" replace />
          }
        />
        <Route
          path="/inventory"
          element={
            isAuthenticated ? <Inventory onLogout={handleLogout} /> : <Navigate to="/customer" replace />
          }
        />
        <Route
          path="/orders"
          element={
            isAuthenticated ? <Sales onLogout={handleLogout} /> : <Navigate to="/customer" replace />
          }
        />
        <Route
          path="/reports"
          element={
            isAuthenticated ? <Reports onLogout={handleLogout} /> : <Navigate to="/customer" replace />
          }
        />
        <Route
          path="/menu"
          element={
            isAuthenticated ? <Menu onLogout={handleLogout} /> : <Navigate to="/customer" replace />
          }
        />
        <Route
          path="/settings"
          element={
            isAuthenticated ? <Settings onLogout={handleLogout} /> : <Navigate to="/customer" replace />
          }
        />
        <Route
          path="/publish"
          element={
            isAuthenticated ? <Publish onLogout={handleLogout} /> : <Navigate to="/customer" replace />
          }
        />

        {/* Customer pages */}
        <Route path="/customer/onboarding" element={<CustomerOnboarding />} />
        <Route path="/customer/menu" element={<CustomerMenu />} />
        <Route path="/customer/taste-profile" element={<CustomerTasteProfile />} />
        <Route path="/customer/collection" element={<CustomerCollection />} />
        <Route path="/customer/order-history" element={<CustomerOrderHistory />} />

        {/* Splash → unified login */}
        <Route path="/" element={<SplashScreen />} />
      </Routes>
    </Router>
  )
}

export default App
