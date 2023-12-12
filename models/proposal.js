const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  proposalText: String,
  potentialResearchBenefits: String,
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  applicatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  applicantUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const Proposal = mongoose.model('Proposal', proposalSchema);

module.exports = Proposal;
