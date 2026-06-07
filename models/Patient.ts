import { initDB, createModel } from 'lyzr-architect'

let _model: any = null

export default async function getPatientModel() {
  if (!_model) {
    await initDB()
    _model = createModel('Patient', {
      name: { type: String, required: true },
      age: { type: String, default: '' },
      blood_type: { type: String, required: true },
      location: { type: String, default: '' },
      hospital: { type: String, default: '' },
      caregiver: { type: String, default: '' },
      caregiver_phone: { type: String, default: '' },
      transfusions: { type: Number, default: 0 },
      frequency_days: { type: Number, default: 21 },
      iron_level: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
      last_transfusion: { type: Date, default: null },
      notes: { type: String, default: '' },
    })
  }
  return _model
}
