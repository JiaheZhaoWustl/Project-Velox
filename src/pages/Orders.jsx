import React from 'react'
import Layout from '../components/Layout'

function Orders({ onLogout }) {
  return (
    <Layout onLogout={onLogout}>
      <div className="page-content">
        <h1>Orders</h1>
        <p>View and manage customer orders and requests.</p>
        
        <div className="orders-section">
          <h2>Recent Orders</h2>
          <p>Order management features coming soon...</p>
        </div>
      </div>
    </Layout>
  )
}

export default Orders
