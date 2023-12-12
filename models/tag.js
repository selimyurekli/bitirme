const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  name: String,
  projectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }]
});

const Tag = mongoose.model('Tag', tagSchema);

module.exports = Tag;
