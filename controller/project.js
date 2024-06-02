
const Project = require('../models/project');
const Dataset = require('../models/dataset');
const Proposal = require('../models/proposal');
const User = require('../models/user');
const Tag = require('../models/tag');
const { anonymizeFile, anonymize } = require('../anonymize')
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
        const authUser = await User.findById(id, '-password');

        const tags = req.body.tags;
        const foundTags = await Tag.find({ name: { $in: tags } });
        if (tags.length != foundTags.length) {
            return res.status(400).json({ error: 'Tags are not found in db.' });
        }

        
        const userEmails = req.body.userEmails;
        const userList = await User.find({ email: { $in: userEmails } });

        if (userList.length != userEmails.length) {
            return res.status(400).json({ error: 'Some or all users are not found in db.' });
        }

        const collaboratorEmails = req.body.collaboratorEmails;
        
        const collaboratorList = await User.find({ email: { $in: collaboratorEmails } });
        if (collaboratorList.length != collaboratorEmails.length) {
            return res.status(400).json({ error: 'Some or all collaborators are not found in db.' });
        }

        const newProject = new Project({
            name: req.body.name,
            description: req.body.description,
            abstract: req.body.abstract,
            isPublic: req.body.isPublic,
            ownerId: authUser._id,
            userIds: userList,
            collaboratorIds: collaboratorList,
            tagIds: foundTags
        });


        const savedProject = await newProject.save();
        
        authUser.ownedProjectIds.push(savedProject._id);
        
        userList.forEach(async function (user) {
            user.sharedProjectIds.push(savedProject._id)
            await user.save();
        });

        collaboratorList.forEach(async function (collaborator) {
            collaborator.collaboratedProjectIds.push(savedProject._id);
            await collaborator.save();
        });
        
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
        const id = req.authanticatedUserId;
        const authUser = await User.findById(id, '-password');

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
            projectId: projectId,
            uploadedBy: authUser._id
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
        
        const projects = await Project.find(queryCondition)
            .populate("datasetIds tagIds")
            .sort({ [sortBy]: sortOrder})
            .limit(limit)
            .skip((page - 1) * limit)
        
        const totalProjects = await Project.countDocuments(queryCondition);
        const totalPages = Math.ceil(totalProjects / limit);

        return res.status(200).json({ projects, totalPages, totalProjects });
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
                dataInCtr.forEach((value, i) => {
                    if (Number.isInteger(value)) {
                        result[index[i]] = value;
                    } else {
                        result[index[i]] = parseFloat(value).toFixed(2); // Format float values to 2 decimal places
                    }
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

        const { name, description, abstract, projectId, tagIds} = req.body;
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        if(id != project.ownerId.toString() && !project.collaboratorIds.includes(id)){
            return res.status(404).json({ message: 'Only project owner can edit.' });
        }
        const userEmails = req.body.userEmails;
        const userList = await User.find({ email: { $in: userEmails } });

        if (userList.length != userEmails.length) {
            return res.status(400).json({ error: 'Some or all users are not found in db.' });
        }

        const collaboratorEmails = req.body.collaboratorEmails;

        const collaboratorList = await User.find({ email: { $in: collaboratorEmails } });
        if (collaboratorList.length != collaboratorEmails.length) {
            return res.status(400).json({ error: 'Some or all collaborators are not found in db.' });
        }

        const userIds = userList.map(user => user._id);
        const collaboratorIds = collaboratorList.map(collaborator => collaborator._id);

        const removedCollaborators = project.collaboratorIds.filter(collaboratorId => !collaboratorIds.includes(collaboratorId.toString()));
        const newCollaborators = collaboratorIds.filter(collaboratorId => !project.collaboratorIds.includes(collaboratorId.toString()));

        if (removedCollaborators.length > 0) {
            await User.updateMany(
                { _id: { $in: removedCollaborators } },
                { $pull: { collaboratedProjectIds: projectId } }
            );
        }
        if (newCollaborators.length > 0) {
            await User.updateMany(
                { _id: { $in: newCollaborators } },
                { $addToSet: { collaboratedProjectIds: projectId } }
            );
        }

        const removedUserIds = project.userIds.filter(userId => !userIds.includes(userId.toString()));
        const newUsers = userIds.filter(userId => !project.userIds.includes(userId.toString()));
        if (removedUserIds.length > 0) {
            await User.updateMany(
                { _id: { $in: removedUserIds } },
                { $pull: { sharedProjectIds: projectId } }
            );
        }
        if (newUsers.length > 0) {
            await User.updateMany(
                { _id: { $in: newUsers } },
                { $addToSet: { sharedProjectIds: projectId } }
            );
        }

        const updatedProject = await Project.findByIdAndUpdate(projectId, {
            name: name,
            description: description,
            abstract: abstract,
            tagIds: tagIds,
            userIds: userList,
            collaboratorIds: collaboratorList
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

        var collaboratorIds = await User.find({ collaboratedProjectIds: projectId }, '_id');
        await User.updateMany(
            { _id: { $in: collaboratorIds } },
            { $pull: { collaboratedProjectIds: projectId } }
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

const livePreview = async function (req, res, next){
    const data = req.body.data;

    const columnNames = req.body.columnNames.split(',');
    const columnActions = req.body.columnActions.split(',');

    const anonymizationMethods = {};
    columnNames.forEach((column, index) => {
        anonymizationMethods[column] = columnActions[index];
    });

    const anonymizedData = anonymize(data, anonymizationMethods, null);
    return res.status(200).json({anonymizedData});
    
}
module.exports = { createProject, createDatasetAndAdd2Project, detailProject, exploreProjects, previewDataset, removeDataset, editProject, deleteProject, getFileExtension, livePreview }