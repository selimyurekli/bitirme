const mongoose = require('mongoose');

const datasetSchema = new mongoose.Schema({
  name: String,
  extension: String,
  url: String,
  contentHTML: String,
  fields: [String],
  fieldDescriptions: [String],
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }
});

const Dataset = mongoose.model('Dataset', datasetSchema);

module.exports = Dataset;
