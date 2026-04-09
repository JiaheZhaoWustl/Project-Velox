function excelDateToISO(serial) {
  if (serial == null || serial === '') return '—'
  const n = Number(serial)
  if (Number.isNaN(n)) return String(serial)
  const date = new Date((n - 25569) * 86400 * 1000)
  return date.toISOString().slice(0, 10)
}

function normalizeRow(row, index = 0) {
  const get = (...names) => {
    for (const name of names) {
      const val = row[name]
      if (val !== undefined && val !== null && val !== '') return val
    }
    return null
  }

  const name = get('Ingredient', 'Item Name', 'Item name', 'Item', 'Product', 'Name', 'Ingredient Name')
  let category = get('Category', 'Type', 'Category/Type', 'Liquor Type', 'Ingredient Type', 'Group')
  let quantity = get('Quantity', 'Qty', 'Stock', 'Units', 'In Stock', 'Available', 'Amount')
  let unitPrice = get('Unit Price', 'Price', 'Unit Price ($)', 'Cost', 'Unit Cost', 'Price per Unit', 'Cost per Unit')

  if (typeof quantity === 'number') quantity = quantity
  else if (typeof quantity === 'string') quantity = parseInt(quantity, 10) || 0
  else quantity = 0

  if (typeof unitPrice === 'number') unitPrice = unitPrice
  else if (typeof unitPrice === 'string') unitPrice = parseFloat(String(unitPrice).replace(/[^0-9.-]/g, '')) || 0
  else unitPrice = 0

  if (category != null) {
    category = String(category).trim()
    category = category.replace(/\bliquor\b/gi, '').trim()
    category = category.replace(/^[-,\s]+|[-,\s]+$/g, '').trim()
    if (!category || category.toLowerCase() === 'liquor') {
      const liquorTypes = ['vodka', 'whiskey', 'whisky', 'bourbon', 'rum', 'gin', 'tequila', 'mezcal', 'brandy', 'cognac', 'scotch', 'rye']
      const nameLower = name ? String(name).toLowerCase() : ''
      for (const type of liquorTypes) {
        if (nameLower.includes(type)) {
          category = type.charAt(0).toUpperCase() + type.slice(1)
          break
        }
      }
      if (!category) category = '—'
    }
  } else {
    category = '—'
  }

  const allColumns = {}
  Object.keys(row).forEach((key) => {
    const val = row[key]
    if (val !== undefined && val !== null && val !== '') {
      allColumns[key] = typeof val === 'string' ? val.trim() : val
    }
  })

  return {
    id: index + 1,
    name: name != null ? String(name).trim() : '—',
    category,
    quantity,
    unitPrice: Number(unitPrice.toFixed(2)),
    rawData: allColumns,
  }
}

function normalizeSalesRow(row, index = 0) {
  const get = (...names) => {
    for (const name of names) {
      const val = row[name]
      if (val !== undefined && val !== null && val !== '') return val
    }
    return null
  }

  const orderId = get('Order ID', 'OrderID', 'Order Id')
  const date = get('Date')
  const channel = get('Channel')
  const location = get('Location')
  const bartender = get('Bartender')
  const itemName = get('Item Name', 'Item name', 'Item')
  const category = get('Category')
  let qty = get('Qty', 'Quantity')
  let unitPrice = get('Unit Price', 'Unit Price ($)')
  let total = get('Total', 'Net Sales', 'Gross Sales')

  if (typeof qty === 'number') qty = qty
  else if (typeof qty === 'string') qty = parseInt(qty, 10) || 0
  else qty = 0

  if (typeof unitPrice === 'number') unitPrice = unitPrice
  else if (typeof unitPrice === 'string') unitPrice = parseFloat(String(unitPrice).replace(/[^0-9.-]/g, '')) || 0
  else unitPrice = 0

  if (typeof total === 'number') total = total
  else if (typeof total === 'string') total = parseFloat(String(total).replace(/[^0-9.-]/g, '')) || 0
  else total = 0

  return {
    id: index + 1,
    orderId: orderId != null ? String(orderId).trim() : '—',
    date: excelDateToISO(date),
    channel: channel != null ? String(channel).trim() : '—',
    location: location != null ? String(location).trim() : '—',
    bartender: bartender != null ? String(bartender).trim() : '—',
    itemName: itemName != null ? String(itemName).trim() : '—',
    category: category != null ? String(category).trim() : '—',
    qty,
    unitPrice: Number(unitPrice.toFixed(2)),
    total: Number(total.toFixed(2)),
    paymentMethod: get('Payment Method', 'Payment') != null ? String(get('Payment Method', 'Payment')).trim() : '—',
    rawData: { ...row },
  }
}

module.exports = {
  excelDateToISO,
  normalizeRow,
  normalizeSalesRow,
}
