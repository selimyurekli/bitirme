
const Project = require('../models/project');
const Dataset = require('../models/dataset');
const Proposal = require('../models/proposal');
const User = require('../models/user');
const Tag = require('../models/tag');
const { anonymizeFile } = require('../anonymize')
const TokenManager = require('../utils/TokenManager');
const fs = require('fs');
const { default: mongoose } = require('mongoose');
const path = require('path');
const dfd = require("danfojs-node");
const { json } = require('express');


const tokenManager = new TokenManager();

function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

const createProject = async function (req, res, next) {
    try {

        const id = req.authanticatedUserId;
        const authUser = await User.findById(id, '-password')

        const tags = req.body.tags;
        const foundTags = await Tag.find({ name: { $in: tags } });
        if (tags.length != foundTags.length) {
            return res.status(400).json({ error: 'Tags are not found in db.' });
        }

        let collaborators = [];
        if (req.body.isPublic == false) {
            const userEmails = req.body.userEmails;
            collaborators = await User.find({ email: { $in: userEmails } });
            if(!collaborators){
                return res.status(400).json({ error: 'There are no users' });
            }
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


        const savedProject = await newProject.save();
        authUser.ownedProjectIds.push(savedProject._id);
        if (req.body.isPublic == false) {
            collaborators.forEach(async function (collaborator) {
                collaborator.sharedProjectIds.push(savedProject._id)
                await collaborator.save();
            });
        }
        
        foundTags.forEach(async function (foundTag) {
            foundTag.projectIds.push(savedProject._id)
            await foundTag.save();
        });


        await authUser.save();

        return res.status(201).json({ "projectId": savedProject });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

const createDatasetAndAdd2Project = async function (req, res, next) {
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
        console.log(file);
        const extension = getFileExtension(file.originalname);

        const dataset = new Dataset({
            name: req.body.name,
            description: req.body.description,
            extension: extension,
            projectId: projectId
        });

        const filePath = `./datasets/${projectId}-${dataset._id}.${extension}`;
        const anonymFilePath = `./anonymdatasets/${projectId}-${dataset._id}.${extension}`;


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

        return res.status(200).json({
            "message": "Dataset added succesfully",
            dataset
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

const detailProject = async function (req, res, next) {
    try {
        var project = await Project.findById(req.body.projectId).populate("datasetIds");
        if (!project) {
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
        sortBy = sortBy || 'name';
        sortOrder = sortOrder === 'desc' ? -1 : 1;
        search = search || '';
        tags = tags || '';

        const regexSearch = new RegExp(search, 'i');

        let queryCondition = { isPublic: true };

        if (search) {
            queryCondition.$text = { $search: search };
        }

        if (tags) {
            const tagNames = tags.split(',');
            const tagIds = await Tag.find({ name: { $in: tagNames } }, '_id');
            const tagIdsList = tagIds.map(tag => tag._id.toString());
            queryCondition.tagIds = { $in: tagIdsList };
        }
        
        console.log(queryCondition);
        const projects = await Project.find(queryCondition)
            .populate("datasetIds tagIds")
            .sort({ [sortBy]: sortOrder})
            .limit(limit)
            .skip((page - 1) * limit)
        
        const totalProjects = await Project.countDocuments(queryCondition);
        const totalPages = Math.ceil(totalProjects / limit);

        return res.status(200).json({ projects, totalPages });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

const previewDataset = async function (req, res, next) {
    try {

        const dataset = await Dataset.findById(req.body.datasetId);

        if (!dataset) {
            return res.status(400).json({ error: 'Dataset not found.' });
        }

        const projectId = dataset.projectId._id;

        let df; 

        if (fs.existsSync(dataset.anonym_url)) {
            if (dataset.extension == "json") {

                df = await dfd.readJSON(dataset.anonym_url);
            } else {
                df = await dfd.readCSV(dataset.anonym_url);
            }
        }
        else {
            console.log("not found dataset file.")
            return res.status(500).json({ error: 'Dataset not found.' });
        }
        

        const headValues = df.head().values;
        const columns = df.columns;
        const ctypes = df.ctypes["$dataIncolumnFormat"];
        let unique = [...new Set(ctypes)];

        let jsonSummary = [];

        if(!(unique.length == 1 && unique[0] == 'string')){
            
            const dataIncolumnFormat = df.describe()["$dataIncolumnFormat"];
            const index = df.describe()['$index'];
            const describedColumns = df.describe()["columns"];


            for (let ctr in dataIncolumnFormat) {
                const dataInCtr = dataIncolumnFormat[ctr];

                const result = {};
                dataInCtr.forEach((key, i) => {
                    result[index[i]] = dataInCtr[i];
                });
                result['column'] = describedColumns[ctr]
                jsonSummary.push(result);
            }
        }
        
        return res.status(200).json({ jsonSummary, headValues, columns, dataset});
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

const removeDataset = async function (req, res, next) {

    try {
        const dataset = await Dataset.findByIdAndDelete(req.body.datasetId);
        if (!dataset) {
            return res.status(400).json({ error: 'Dataset not found.' });
        }
        
        const savedProject = await Project.findOneAndUpdate(
            { '_id': dataset.projectId },
            { $pull: { datasetIds: req.body.datasetId }},
            {new: true}
        );

        if (fs.existsSync(dataset.url) && fs.existsSync(dataset.anonym_url) ) {

            fs.unlinkSync(dataset.url);
            fs.unlinkSync(dataset.anonym_url);
            return res.status(200).json({ message: 'File deleted successfully' });
        } else {
            
            return res.status(200).json({ message: 'File not found but dataset deleted' });
        }

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

const editProject = async function(req, res, next) {
    try {
        const id = req.authanticatedUserId;
        var authUser = await User.findById(id).select('-password');        

        const { name, description, abstract, projectId, tagIds } = req.body;
        const project = await Project.findById(projectId);

        if(id != project.ownerId.toString()){
            return res.status(404).json({ message: 'Only project owner can edit.' });
        }

        const updatedProject = await Project.findByIdAndUpdate(projectId, {
            name: name,
            description: description,
            abstract: abstract,
            tagIds: tagIds
        }, { new: true });

        if (!updatedProject) {
            return res.status(404).json({ message: 'Project not found' });
        }

        return res.status(200).json({ message: 'Project updated successfully', user: updatedProject });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server Error' });
    }

}

const deleteProject = async function (req, res, next) {
    try {
        const id = req.authanticatedUserId;
        var authUser = await User.findById(id).select('-password');
        var projectId = req.body.projectId;
        const project = await Project.findById(projectId);
        if(!project){
            return res.status(400).json({ message: 'Project not found' });

        }
        if (id != project.ownerId.toString()) {
            return res.status(400).json({ message: 'Only project owner can delete.' });
        }

        if (project.datasetIds.length != 0) {
            return res.status(400).json({ message: 'Please remove dataset first.' });
        }

        var userIds = await User.find({ sharedProjectIds: projectId }, '_id');
        await User.updateMany(
            { _id: { $in: userIds } },
            { $pull: { sharedProjectIds: projectId } }
        );

        await User.updateMany(
            { _id: id  },
            { $pull: { ownedProjectIds: projectId } }
        );

        const tagIds = await Tag.find({ projectIds: projectId }, '_id');
        await Tag.updateMany(
            { _id: { $in: tagIds } },
            { $pull: { projectIds: projectId } }
        );

        var proposals = await Proposal.find({ projectId: projectId }, 'applicatorId');
        for (proposal of proposals){
            await User.updateOne(
                { _id: proposal.applicatorId },
                { $pull: { proposalIds: proposal._id } }
            );
        }

        await Proposal.deleteMany({projectId: projectId});

        const projects = await Project.findByIdAndDelete(projectId);
        return res.status(200).json({ message: "Project successfully deleted." });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server Error' });
    }


}


module.exports = { createProject, createDatasetAndAdd2Project, detailProject, exploreProjects, previewDataset, removeDataset, editProject, deleteProject, getFileExtension }