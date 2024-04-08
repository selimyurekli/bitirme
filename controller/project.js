
const Project = require('../models/project'); 
const Dataset = require('../models/dataset');
const Proposal = require('../models/proposal'); 
const User = require('../models/user'); 
const Tag = require('../models/tag'); 
const {anonymizeFile} = require('../anonymize')
const TokenManager = require('../utils/TokenManager');
const fs = require('fs');
const { default: mongoose } = require('mongoose');
const path = require('path');


const tokenManager = new TokenManager();

function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

const createProject = async function(req, res, next) {
    try {
        
        const id = req.authanticatedUserId;
        const authUser = await User.findById(id).select("-password");
        console.log(authUser)
        const tags = req.body.tags;
        const foundTags = await Tag.find({ name: { $in: tags } });
        if (tags.length != foundTags.length) {
            return res.status(400).json({ error: 'Tags are not found in db.' });
        }

        let collaborators;
        if(req.body.isPublic==false){
            const userEmails = req.body.userEmails;
            collaborators = await User.find({ email: { $in: userEmails } }, '_id');
            if (collaborators.length != userEmails.length) {
                return res.status(400).json({ error: 'Some or all users are not found in db.' });
            }
        }
        
        const newProject = new Project({
          name: req.body.name,
          description: req.body.description,
          abstract: req.body.abstract,
          isPublic: req.body.isPublic,
          ownerId: authUser._id, 
          userIds: !req.body.isPublic ? collaborators : [],
          tagIds: foundTags
        });
        //TODO: send mail to collabrators.
        //TODO: add collabrators to a list.


        console.log(authUser);
        const savedProject = await newProject.save();
        authUser.projectIds.push(savedProject._id);
        await authUser.save();
    
        return res.status(201).json({"projectId" : savedProject});
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
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
            description: req.body.description,
            extension: extension,
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

        const columnNames = req.body.columnNames.split(',');
        const columnActions = req.body.columnActions.split(',');

        const anonymizationMethods = {};
        columnNames.forEach((column, index) => {
            anonymizationMethods[column] = columnActions[index];
        });

        anonymizeFile(filePath, anonymizationMethods, anonymFilePath);

        return res.status(200).json({"message" : "Dataset added succesfully",
                              dataset});
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
 
const detailProject = async function (req, res, next) {
    try {
        var project = await Project.findById(req.body.projectId).populate("datasetIds");
        if(!project){
            return res.status(400).json({ error: 'Project not found.' });
        }

        return res.status(200).json({ project });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

const exploreProjects = async function (req, res, next) {
    try {
        let { page, limit, sortBy, sortOrder, search, tags } = req.query;

        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        sortBy = sortBy || 'createdAt'; 
        sortOrder = sortOrder === 'desc' ? -1 : 1;
        search = search || '';
        tags = tags || '';

        const searchQuery = {
            $or: [
                { name: { $regex: search, $options: 'i' } }, 
                { description: { $regex: search, $options: 'i' } },
                { 'datasetIds.name': { $regex: search, $options: 'i' } } // bu kısım çalışmıyor
            ]
        };

        const projects = await Project.find(searchQuery)
            .populate("datasetIds tagIds")
            .sort({ [sortBy]: sortOrder })
            .skip((page - 1) * limit)
            .limit(limit);

        return res.status(200).json({ projects });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
} 

const previewDataset = async function (req, res, next) {
    try {
        var dataset = await Dataset.findById(req.body.datasetId);
        
        if (!dataset) {
            return res.status(400).json({ error: 'Dataset not found.' });
        }
        
        return res.status(200).json({ dataset });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

function summarizeData(data) {
    const summary = {};

    data.forEach(item => {

        Object.keys(item).forEach(key => {

            if (!summary[key]) {
                summary[key] = {
                    count: 0,
                    sum: 0,
                    min: Infinity,
                    max: -Infinity,
                    average: 0
                };
            }

            const value = item[key];
            if (typeof value === 'number') {
                summary[key].sum += value;
                summary[key].min = Math.min(summary[key].min, value);
                summary[key].max = Math.max(summary[key].max, value);
            }

            summary[key].count++;
        });
    });

    Object.keys(summary).forEach(key => {
        if (summary[key].count > 0) {
            summary[key].average = summary[key].sum / summary[key].count;
        }
    });

    return summary;
}
module.exports = { createProject, createDatasetAndAdd2Project, detailProject, exploreProjects, previewDataset}