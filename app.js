const mongoose = require('mongoose');
const express = require('express')
var bodyParser = require('body-parser')
var multer = require('multer');
var upload = multer();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));
app.use(upload.any());


const index = require('./routes/index')

require('./db');


//cors kısmını halledelim...


app.use("/api", index);

app.listen(3838,()=>{
  console.log("The application is started on port: ",3838);
});
