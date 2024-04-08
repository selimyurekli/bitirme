const mongoose = require('mongoose');
const express = require('express')
var bodyParser = require('body-parser')
var multer = require('multer');
var cors = require('cors');
const path = require('path');
const { datasetFolderAccessController } = require('./middlewares/user');

var upload = multer();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));
app.use(upload.any());

app.use('/datasets', datasetFolderAccessController ,express.static(path.join(__dirname, 'datasets')));
app.use('/anonymdatasets', datasetFolderAccessController, express.static(path.join(__dirname, 'anonymdatasets')));


const index = require('./routes/index')

require('./db');


app.use(cors());
app.use("/api", index);

app.listen(3838,()=>{
  console.log("The application is started on port: ",3838);
});
