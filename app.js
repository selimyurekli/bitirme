const mongoose = require('mongoose');
const express = require('express')
const app = express();

const index = require('./routes/index')

require('./db');

const User = require('./models/user');
const Project = require('./models/project');
const Proposal = require('./models/proposal');
const Dataset = require('./models/dataset');
const Tag = require('./models/tag');
const Institution = require('./models/institution');

app.use("/api", index);

app.listen(3838,()=>{
  console.log("The application is started on port: ",3838);
});
