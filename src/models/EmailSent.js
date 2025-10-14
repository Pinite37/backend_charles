import mongoose from 'mongoose';

const emailSentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  sentAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
  error: { type: String }
});

const EmailSent = mongoose.model('EmailSent', emailSentSchema);

export default EmailSent;