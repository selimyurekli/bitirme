const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: String,
  description: String,
  abstract: String,
  isPublic: Boolean,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  datasetIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Dataset' }],
  tagIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  ownerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  resourceCreatorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  proposalIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' }]
});

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
