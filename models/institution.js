const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
  name: String,
  address: String
});

const Institution = mongoose.model('Institution', institutionSchema);

module.exports = Institution;
