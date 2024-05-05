const express = require("express");
const multer = require('multer');
const path = require('path');

const router = express.Router();
const { createProject, createDatasetAndAdd2Project, exploreProjects, detailProject, previewDataset, removeDataset } = require("../controller/project")

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, './datasets/');
    },
    filename: function(req, file, cb) {
      const fileName = `${req.projectId}-${req.datasetId}.${getFileExtension(file.originalname)}`
      cb(null, fileName); 
    }
  });

function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

function fileFilter(req, file, cb) {
    
    const allowedMimes = ['application/json', 'text/csv'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JSON and CSV files are allowed.'), false);
    }
}
  
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter
});


router.post("/create", createProject);
router.post("/add-dataset", createDatasetAndAdd2Project);
router.get("/", exploreProjects);
router.post("/detail", detailProject);
router.post("/preview-dataset", previewDataset);
router.post("/remove-dataset", removeDataset);

module.exports = router;