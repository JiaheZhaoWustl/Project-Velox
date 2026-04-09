import React from 'react'
import Layout from '../components/Layout'

function Settings({ onLogout }) {
  return (
    <Layout onLogout={onLogout}>
      <div className="page-content">
        <h1>Settings</h1>
        <p>Configure your bar settings and preferences.</p>
        
        <div className="settings-section">
          <h2>Account Settings</h2>
          <p>Settings management features coming soon...</p>
        </div>
      </div>
    </Layout>
  )
}

export default Settings
