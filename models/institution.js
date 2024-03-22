const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
  name: { type: String, unique: true },
  address: String
});

const Institution = mongoose.model('Institution', institutionSchema);

module.exports = Institution;
