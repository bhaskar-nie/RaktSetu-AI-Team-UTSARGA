import { initDB, createModel } from 'lyzr-architect'

let _model: any = null

export default async function getBridgeModel() {
  if (!_model) {
    await initDB()
    _model = createModel('Bridge', {
      bridge_name: { type: String, required: true },
      patient_id: { type: String, default: '' },
      patient_name: { type: String, default: '' },
      blood_type: { type: String, required: true },
      status: { type: String, enum: ['healthy', 'at-risk', 'critical'], default: 'healthy' },
      primary_donors: { type: Number, default: 0 },
      backup_donors: { type: Number, default: 0 },
      reliability: { type: Number, default: 80 },
      coordinator: { type: String, default: '' },
      coordinator_phone: { type: String, default: '' },
      next_transfusion: { type: Date, default: null },
      donor_health: { type: Array, default: [] },
    })
  }
  return _model
}
