const Institution = require('../models/institution'); 

const addInstitution = async function(req, res, next) {
  try {
    const institution = new Institution(req.body);
    await institution.save();
    res.status(200).json({ message: 'Institution added successfully', institution });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

const getInstutitions = async function(req, res, next) {
  try {
    const institutions = await Institution.find();
    res.status(200).json(institutions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}


module.exports = {addInstitution, getInstutitions}