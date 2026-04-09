const path = require('path')

const PROJECT_ROOT = path.resolve(__dirname, '../..')
const USER_UPLOADS = path.join(PROJECT_ROOT, 'userUploads')
const USER_INPUTS = path.join(PROJECT_ROOT, 'userInputs')
const TASTE_PROFILES_DIR = path.join(USER_INPUTS, 'tasteProfiles')
/** Customer accounts DB (JSON). Override with CUSTOMERS_DB_PATH for deploy. */
const DATA_DIR = process.env.CUSTOMERS_DATA_DIR
  ? path.resolve(process.env.CUSTOMERS_DATA_DIR)
  : path.join(PROJECT_ROOT, 'data')
const CUSTOMERS_DB_PATH = process.env.CUSTOMERS_DB_FILE
  ? path.resolve(process.env.CUSTOMERS_DB_FILE)
  : path.join(DATA_DIR, 'customers.json')

module.exports = {
  PROJECT_ROOT,
  USER_UPLOADS,
  USER_INPUTS,
  DATA_DIR,
  TASTE_PROFILES_DIR,
  CUSTOMERS_DB_PATH,
  DEFAULT_INVENTORY_FILE: 'Project_Velox_Fake_Bar_Inventory.xlsx',
  DEFAULT_SALES_FILE: 'Project_Velox_Fake_Sales_Data.xlsx',
  SALES_MAX_ENTRIES: 100,
}
