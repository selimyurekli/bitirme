const mongoose = require('mongoose');

const datasetSchema = new mongoose.Schema({
  name: String,
  description: String,
  created_at: { type: Date, default: Date.now },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  extension: String,
  url: String,
  anonym_url: String,
  contentHTML: String,
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }
});

const Dataset = mongoose.model('Dataset', datasetSchema);

module.exports = Dataset;
