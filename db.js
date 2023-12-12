// db.js
const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://selimyurekligs:Selim12345@cluster0.bvqodo0.mongodb.net/Bitirme', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});



