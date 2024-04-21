const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: String,
  password: String, 
  name: String,
  surname: String,
  verified: {type: Boolean, default : false},
  verificationCode: Number,
  address: String,
  role: {type: String, default : 'user'},
  created_at: { type: Date, default: Date.now },
  blocked: {type: Boolean, default : false},
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
  ownedProjectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  sharedProjectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  proposalIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' }]
});

userSchema.pre('save', async function(next) {
  try {
    if (!this.isModified('password')) {
      return next();
    }
    const hashedPassword = await bcrypt.hash(this.password, 10);
    this.password = hashedPassword;
    return next();
  } catch (error) {
    return next(error);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
