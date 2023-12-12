const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: String,
  phone: String,
  name: String,
  surname: String,
  role: String,
  created_at: { type: Date, default: Date.now },
  blocked: Boolean,
  verified: Boolean,
  verificationCode: Number,
  address: String,
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
  projectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  proposalIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' }]
});

const User = mongoose.model('User', userSchema);

module.exports = User;
