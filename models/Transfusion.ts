import { initDB, createModel } from 'lyzr-architect'

let _model: any = null

export default async function getTransfusionModel() {
  if (!_model) {
    await initDB()
    _model = createModel('Transfusion', {
      patient_id: { type: String, required: true },
      patient_name: { type: String, default: '' },
      donor_id: { type: String, default: '' },
      donor_name: { type: String, default: '' },
      blood_type: { type: String, default: '' },
      scheduled_date: { type: Date, required: true },
      completed_date: { type: Date, default: null },
      status: {
        type: String,
        enum: ['scheduled', 'confirmed', 'completed', 'cancelled'],
        default: 'scheduled',
      },
      hospital: { type: String, default: '' },
      notes: { type: String, default: '' },
    })
  }
  return _model
}
