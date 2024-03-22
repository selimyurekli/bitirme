const Tag = require('../models/tag');

const addTag = async function(req, res, next) {
  try {
    const tag = new Tag(req.body);
    await tag.save();
    res.status(200).json({ message: 'Tag added successfully', tag });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

const getTags = async function(req, res, next) {
  try {
    const tags = await Tag.find();
    res.status(200).json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {addTag, getTags}