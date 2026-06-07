import { initDB, createModel } from 'lyzr-architect'

let _model: any = null

export default async function getDonorModel() {
  if (!_model) {
    await initDB()
    _model = createModel('Donor', {
      name: { type: String, required: true },
      blood_type: { type: String, required: true },
      last_donation: { type: Date, default: null },
      contact: { type: String, default: '' },
      location: { type: String, default: '' },
      status: { type: String, default: 'Available' },
      email: { type: String, default: '' },
    })
  }
  return _model
}
