
const Project = require('../models/project'); 
const Dataset = require('../models/dataset');
const Proposal = require('../models/proposal'); 
const User = require('../models/user'); 
const Tag = require('../models/tag'); 
const {anonymizeFile} = require('../anonymize')
const TokenManager = require('../utils/TokenManager');
const fs = require('fs')

const tokenManager = new TokenManager();

function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

const createProject = async function(req, res, next) {
    try {
        const token = (req.headers.authorization);
        const userEmails = req.body.userEmails;
        const ownerId = tokenManager.verifyToken(token);

        const collaborators = await User.find({ email: { $in: userEmails } }, '_id');
        if (collaborators.length != userEmails.length) {
            res.status(400).json({ error: 'Some or all users are not found in db.' });
        }

        const ownerUser = await User.findById(ownerId, '_id');

        const tags = req.body.tags;
        const foundTags = await Tag.find({ name: { $in: tags } });

        if (tags.length != foundTags.length) {
            res.status(400).json({ error: 'Tags are not found in db.' });
        }

    
        const newProject = new Project({
          name: req.body.name,
          description: req.body.description,
          abstract: req.body.abstract,
          isPublic: req.body.isPublic,
          ownerIds: [ownerUser], 
          userIds: collaborators,
        });
        //TODO: send mail to collabrators.

        const savedProject = await newProject.save();
    
        res.status(201).json({"projectId" : savedProject._id});
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
}

const createDatasetAndAdd2Project = async function(req, res, next) {
    try {
        
        const projectId = req.body.projectId;
        const project = await Project.findById(projectId);
        
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({ error: 'No files were uploaded' });
        }
    
        const file = req.files[0];
        const extension = getFileExtension(file.originalname);

        const dataset = new Dataset({
            name: req.body.name,
            extension: extension,
            fields: req.body.fields.split(','),
            fieldDescriptions: req.body.fieldDescriptions.split(','),
            projectId: projectId
        });
        const counter = project.datasetIds.length+1;
        
        const filePath = `./datasets/${projectId}-${dataset._id}-${counter}.${extension}`;
        const anonymFilePath = `./anonymdatasets/${projectId}-${dataset._id}-${counter}.${extension}`;


        fs.writeFile(filePath, file.buffer, (err) => {
            if (err) {
                console.error('Error writing file:', err);
                throw err;
            } else {
                console.log('File saved successfully:', filePath);
            }
        });
        dataset.url = filePath;
        dataset.anonym_url = anonymFilePath;
        
        project.datasetIds.push(dataset);
        dataset.projectId = project;
        await project.save();
        await dataset.save();

        const methodsToAnonymizeCols = req.body.methodsToAnonymizeCols.split(',');
        const methodsToAnonymizeTech = req.body.methodsToAnonymizeTech.split(',');

        const anonymizationMethods = {};
        methodsToAnonymizeCols.forEach((column, index) => {
            anonymizationMethods[column] = methodsToAnonymizeTech[index];
        });

        anonymizeFile(filePath, anonymizationMethods, anonymFilePath);

        res.status(200).json({"message" : "Dataset added succesfully",
                              dataset});
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
 



module.exports = {createProject, createDatasetAndAdd2Project}