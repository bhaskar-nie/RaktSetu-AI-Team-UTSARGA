import { initDB, createModel } from 'lyzr-architect'

let _model: any = null

export default async function getBloodRequestModel() {
  if (!_model) {
    await initDB()
    _model = createModel('BloodRequest', {
      blood_type: { type: String, required: true },
      units_needed: { type: Number, required: true, default: 1 },
      urgency: { type: String, default: 'Normal' },
      status: { type: String, default: 'Pending' },
      hospital: { type: String, default: '' },
      patient_name: { type: String, default: '' },
      notes: { type: String, default: '' },
    })
  }
  return _model
}
