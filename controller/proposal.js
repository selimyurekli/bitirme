const Proposal = require('../models/proposal');
const User = require('../models/user');
const Project = require('../models/project');
const TokenManager = require('../utils/TokenManager');
const { response } = require('express');

const tokenManager = new TokenManager();


const createProposal = async function(req, res, next) {
    try {

        const id = req.authanticatedUserId;
        const authUser = await User.findById(id);
        
        const applicantUserIds = req.body.applicantUserIds;

        const collaborators = await User.find({ email: { $in: applicantUserIds } }, '_id');
        
        if (collaborators.length != applicantUserIds.length) {
            return res.status(400).json({ error: 'Some or all users are not found in db.' });
        }

        const newProposal = new Proposal({
            proposalText: req.body.proposalText,
            potentialResearchBenefits: req.body.potentialResearchBenefits,
            projectId: req.body.projectId,
            applicatorId: authUser._id,
            applicantUserIds: collaborators
        });
        
        const savedProposal = await newProposal.save();
        const project = await Project.findById(savedProposal.projectId);
        authUser.proposalIds.push(savedProposal);
        project.proposalIds.push(savedProposal);
        await authUser.save();
        await project.save();

        return res.status(201).json(savedProposal);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Server Error' });
        }
}

const updateProposal = async function(req, res, next) {
    try {
        const token = (req.headers.authorization);
        const proposalCreator = tokenManager.verifyToken(token);
        const applicantUserIds = req.body.applicantUserIds;
        
        const collaborators = await User.find({ email: { $in: applicantUserIds } }, '_id');

        if (collaborators.length != applicantUserIds.length) {
            return res.status(400).json({ error: 'Some or all users are not found in db.' });
        }

        const proposalId = req.body.proposalId;
        const updatedProposal = await Proposal.findByIdAndUpdate(proposalId, {
            proposalText: req.body.proposalText,
            potentialResearchBenefits: req.body.potentialResearchBenefits,
            institutionId: req.body.institutionId,
            projectId: req.body.projectId,
            applicatorId: proposalCreator._id,
            applicantUserIds: applicantUserIds,
            updated_at: Date.now()
        }, { new: true });

        if (!updatedProposal) {
            return res.status(404).json({ error: 'Proposal not found.' });
        }

        return res.status(200).json(updatedProposal);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
}

const evaluateProposal = async function(req, res, next) {
    try{
        const id = req.authanticatedUserId;
        const owner = await User.findById(id);
        const proposalId = req.body.proposalId;
        
        if(req.body.verified != "accept" && req.body.verified != "reject"){ //revision isteyebilir
            return res.status(400).json({ message: 'only words accept or reject are valid.' });
        }

        const proposal = await Proposal.findById(proposalId);
        if(!proposal || proposal.verified != "none") {
            return res.status(400).json({ message: 'proposal not found or already responded.' });
        }
        const project = await Project.findById(proposal.projectId);
        
    
        if(!project) {
            return res.status(400).json({ message: 'project not found.' });
        }

        if (id != project.ownerId){
            return res.status(401).json({ message: 'you are not allowed.' });
        }
    
        proposal.verified = req.body.verified;
        proposal.proposalReviewText = req.body.proposalReviewText;
        proposal.updated_at = Date.now();
        if(proposal.verified == 'accept'){
            if (proposal.applicantUserIds.length != 0){
                project.userIds.push([proposal.applicantUserIds]);
            }
            if (!proposal.applicatorId in project.userIds){
                project.userIds.push(proposal.applicatorId);
            }
        }
        
        proposal2 = await proposal.save();
        project2 = await project.save();

        return res.status(200).json({message: "You successfully evaluated proposal"});
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server Error' });
    }
}

const listProposals = async function(req, res, next) {
    try{
        const id = req.authanticatedUserId;
        const owner = await User.findById(id);

        let response = {}

        let proposalsSent = owner.proposalIds; 
        proposalsSent = await Proposal.find({ _id: { $in: proposalsSent }})
                .sort({ ['updated_at']: 'desc' })

        
        response["sentProposals"] = proposalsSent;
        
        const foundProjects = await Project.find({ _id: { $in: owner.ownedProjectIds } });

        var receivedProposals = [];
        for (const project of foundProjects) {
            const proposalIds = project.proposalIds;
            const foundProposals = await Proposal.find({ _id: { $in: proposalIds }, verified : "none" }, );
            receivedProposals.push({
                "projectId" : project['_id'],
                "projectName" : project['name'],
                "projectDescription": project['description'],
                foundProposals
            })
        }

        response["receivedProposals"] = receivedProposals;
        
        return res.status(200).json(response);
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server Error' });
    }
}



module.exports = {createProposal, updateProposal, evaluateProposal, listProposals}