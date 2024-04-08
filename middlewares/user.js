const TokenManager = require('../utils/TokenManager');
const Project = require("../models/project");
const tokenManager = new TokenManager();
const mongoose = require('mongoose');

const isAuth = function(req, res, next) {
    const token = (req.headers.authorization);
    if(!token){
        return res.status(401).json({ message: "Not authorized. " })
    }
    const id = tokenManager.verifyToken(token)
    if(id){
        req.authanticatedUserId = id;
        next();
    }
    else {
        return res.status(401).json({message: "Not authorized. "})
    }
}

const datasetFolderAccessController = async function (req, res, next) {
    try {
        const token = (req.headers.authorization);
        if (!token) {
            return res.status(401).json({ message: "Not authorized. " })
        }
        const id = tokenManager.verifyToken(token)
        if (id) {
            const url = req.url;
            const filename = url.split("/").pop();
            var projectId = filename.split("-")[0];
            var datasetId = filename.split("-")[1];
            const project = await Project.findById(projectId);

            if(!project){
                return res.status(401).json({ message: "Not found" })
            }
            const isUserInProject = project.userIds.some(userId => userId._id.equals(id));

            if (id == project.ownerId._id || isUserInProject) {
                next();
            }
            else {
                return res.status(401).json({ message: "Not authorized. " })
            }
        }
        else {
            return res.status(401).json({ message: "Not authorized. " })
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" })

    }
}

module.exports = { isAuth, datasetFolderAccessController }