// db.js
const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://selimyurekligs:Selim12345@cluster0.bvqodo0.mongodb.net/Bitirme', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');
  try {
    const Project = require('./models/project'); // Adjust the path to your actual Project model file
    await Project.createIndexes();
    console.log('Indexes ensured');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
});



