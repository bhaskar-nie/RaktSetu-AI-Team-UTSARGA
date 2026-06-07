import { initDB, createModel } from 'lyzr-architect'

let _model: any = null

export default async function getInventoryModel() {
  if (!_model) {
    await initDB()
    _model = createModel('Inventory', {
      blood_type: { type: String, required: true },
      units_available: { type: Number, required: true, default: 0 },
      expiry_date: { type: Date, default: null },
      source: { type: String, default: '' },
      status: { type: String, default: 'Adequate' },
    })
  }
  return _model
}
