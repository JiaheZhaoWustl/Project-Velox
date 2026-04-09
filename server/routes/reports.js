const router = require('express').Router()
const { getXlsxFilesInUserUploads, resolveInventoryFile, resolveSalesFile } = require('../utils/fileResolution')
const { readInventoryFromSpreadsheet } = require('./inventory')
const { readSalesFromSpreadsheet } = require('./sales')

const LOW_STOCK_THRESHOLD = 10

function buildDashboardActivities(invSummary, salesSummary) {
  const activities = []
  if (salesSummary && salesSummary.orderCount > 0) {
    activities.push({
      type: 'sales',
      value: `$${Number(salesSummary.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })} revenue`,
      sub: `${salesSummary.orderCount} orders (from upload)`,
      trend: 'up',
    })
  }
  if (invSummary && invSummary.totalItems > 0) {
    activities.push({
      type: 'inventory',
      value: `${invSummary.totalItems} items`,
      sub: `$${Number(invSummary.totalValue).toLocaleString('en-US', { minimumFractionDigits: 2 })} stock value`,
      trend: 'neutral',
    })
  }
  if (invSummary && invSummary.lowStockCount > 0) {
    activities.push({
      type: 'low stock',
      value: `${invSummary.lowStockCount} items`,
      sub: 'Below threshold — need reorder',
      trend: 'down',
    })
  }
  if (activities.length === 0) {
    activities.push({ type: 'info', value: 'No data yet', sub: 'Upload inventory and sales spreadsheets to userUploads', trend: 'neutral' })
  }
  return activities
}

router.get('/reports/sources', (req, res) => {
  try {
    const inventoryResolved = resolveInventoryFile()
    const salesResolved = resolveSalesFile()
    const allFiles = getXlsxFilesInUserUploads().map((f) => f.name)
    res.json({
      success: true,
      uploadsDir: require('../config/paths').USER_UPLOADS,
      filesInUploads: allFiles,
      inventoryFile: inventoryResolved ? inventoryResolved.name : null,
      salesFile: salesResolved ? salesResolved.name : null,
    })
  } catch (err) {
    console.error('GET /api/reports/sources error:', err)
    res.status(500).json({ success: false, error: 'Failed to list sources' })
  }
})

router.get('/reports/sales', (req, res) => {
  try {
    const { items, sourceFile } = readSalesFromSpreadsheet()
    const totalRevenue = items.reduce((sum, i) => sum + (i.total || 0), 0)
    const uniqueOrders = new Set(items.map((i) => i.orderId)).size
    const avgOrderValue = uniqueOrders > 0 ? totalRevenue / uniqueOrders : 0

    const byChannel = {}
    items.forEach((i) => {
      const ch = i.channel || '—'
      if (!byChannel[ch]) byChannel[ch] = { revenue: 0, orders: 0 }
      byChannel[ch].revenue += i.total || 0
      byChannel[ch].orders += 1
    })
    const byChannelList = Object.entries(byChannel).map(([name, data]) => ({
      channel: name,
      revenue: Number(data.revenue.toFixed(2)),
      orders: data.orders,
    })).sort((a, b) => b.revenue - a.revenue)

    const byCategory = {}
    items.forEach((i) => {
      const cat = i.category || '—'
      if (!byCategory[cat]) byCategory[cat] = { revenue: 0, qty: 0 }
      byCategory[cat].revenue += i.total || 0
      byCategory[cat].qty += i.qty || 0
    })
    const byCategoryList = Object.entries(byCategory).map(([name, data]) => ({
      category: name,
      revenue: Number(data.revenue.toFixed(2)),
      qty: data.qty,
    })).sort((a, b) => b.revenue - a.revenue)

    const byBartender = {}
    items.forEach((i) => {
      const b = i.bartender || '—'
      if (!byBartender[b]) byBartender[b] = { revenue: 0, orders: 0 }
      byBartender[b].revenue += i.total || 0
      byBartender[b].orders += 1
    })
    const byBartenderList = Object.entries(byBartender).map(([name, data]) => ({
      bartender: name,
      revenue: Number(data.revenue.toFixed(2)),
      orders: data.orders,
    })).sort((a, b) => b.revenue - a.revenue)

    res.json({
      success: true,
      sourceFile: sourceFile || null,
      summary: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        orderCount: uniqueOrders,
        lineItemCount: items.length,
        avgOrderValue: Number(avgOrderValue.toFixed(2)),
      },
      byChannel: byChannelList,
      byCategory: byCategoryList,
      byBartender: byBartenderList,
    })
  } catch (err) {
    console.error('GET /api/reports/sales error:', err)
    res.status(500).json({ success: false, error: 'Failed to load sales report' })
  }
})

router.get('/reports/inventory', (req, res) => {
  try {
    const { items, sourceFile } = readInventoryFromSpreadsheet()
    const totalValue = items.reduce((sum, i) => sum + (i.quantity || 0) * (i.unitPrice || 0), 0)
    const lowStockCount = items.filter((i) => (i.quantity || 0) <= LOW_STOCK_THRESHOLD).length
    const byCategory = {}
    items.forEach((i) => {
      const cat = i.category || '—'
      if (!byCategory[cat]) byCategory[cat] = { count: 0, totalQty: 0, value: 0 }
      byCategory[cat].count += 1
      byCategory[cat].totalQty += i.quantity || 0
      byCategory[cat].value += (i.quantity || 0) * (i.unitPrice || 0)
    })
    const byCategoryList = Object.entries(byCategory).map(([name, data]) => ({
      category: name,
      itemCount: data.count,
      totalQty: data.totalQty,
      value: Number(data.value.toFixed(2)),
    })).sort((a, b) => b.value - a.value)

    const lowStockItems = items
      .filter((i) => (i.quantity || 0) <= LOW_STOCK_THRESHOLD)
      .map((i) => ({
        name: i.name,
        category: i.category,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        value: Number(((i.quantity || 0) * (i.unitPrice || 0)).toFixed(2)),
      }))
      .sort((a, b) => a.quantity - b.quantity)

    res.json({
      success: true,
      sourceFile: sourceFile || null,
      summary: {
        totalItems: items.length,
        totalValue: Number(totalValue.toFixed(2)),
        lowStockCount,
        lowStockThreshold: LOW_STOCK_THRESHOLD,
      },
      byCategory: byCategoryList,
      lowStockItems,
    })
  } catch (err) {
    console.error('GET /api/reports/inventory error:', err)
    res.status(500).json({ success: false, error: 'Failed to load inventory report' })
  }
})

router.get('/dashboard', (req, res) => {
  try {
    const inv = readInventoryFromSpreadsheet()
    const sales = readSalesFromSpreadsheet()

    const totalValue = inv.items.reduce((sum, i) => sum + (i.quantity || 0) * (i.unitPrice || 0), 0)
    const lowStockCount = inv.items.filter((i) => (i.quantity || 0) <= LOW_STOCK_THRESHOLD).length
    const uniqueOrders = new Set(sales.items.map((i) => i.orderId)).size
    const totalRevenue = sales.items.reduce((sum, i) => sum + (i.total || 0), 0)

    const invSummary = {
      totalItems: inv.items.length,
      totalValue: Number(totalValue.toFixed(2)),
      lowStockCount,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
    }
    const salesSummary = {
      orderCount: uniqueOrders,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      lineItemCount: sales.items.length,
    }

    const recentActivity = buildDashboardActivities(invSummary, salesSummary)

    res.json({
      success: true,
      overview: {
        totalStockValue: invSummary.totalValue,
        totalItems: invSummary.totalItems,
        lowStockCount: invSummary.lowStockCount,
        orderCount: salesSummary.orderCount,
        totalRevenue: salesSummary.totalRevenue,
      },
      recentActivity,
    })
  } catch (err) {
    console.error('GET /api/dashboard error:', err)
    res.status(500).json({ success: false, error: 'Failed to load dashboard' })
  }
})

module.exports = router
