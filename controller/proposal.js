const Proposal = require('../models/proposal');
const User = require('../models/user');
const Project = require('../models/project');


const createProposal = async function(req, res, next) {
    try {

        const token = (req.headers.authorization);
        const proposalCreator = tokenManager.verifyToken(token);
        const applicantUserIds = req.body.applicantUserIds;

        const collaborators = await User.find({ email: { $in: applicantUserIds } }, '_id');

        if (collaborators.length != applicantUserIds.length) {
            res.status(400).json({ error: 'Some or all users are not found in db.' });
        }

        const newProposal = new Proposal({
            proposalText: req.body.proposalText,
            potentialResearchBenefits: req.body.potentialResearchBenefits,
            institutionId: req.body.institutionId,
            projectId: req.body.projectId,
            applicatorId: proposalCreator._id,
            applicantUserIds: applicantUserIds
        });
    
        const savedProposal = await newProposal.save();
        const project = await Project.findById(savedProposal.projectId);
        project.proposalIds.push([savedProposal]);
        await project.save();

        res.status(201).json(savedProposal);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server Error' });
        }
}

const updateProposal = async function(req, res, next) {
    try {
        const token = (req.headers.authorization);
        const proposalCreator = tokenManager.verifyToken(token);
        const applicantUserIds = req.body.applicantUserIds;
        
        const collaborators = await User.find({ email: { $in: applicantUserIds } }, '_id');

        if (collaborators.length != applicantUserIds.length) {
            res.status(400).json({ error: 'Some or all users are not found in db.' });
        }

        const proposalId = req.body.proposalId;
        const updatedProposal = await Proposal.findByIdAndUpdate(proposalId, {
            proposalText: req.body.proposalText,
            potentialResearchBenefits: req.body.potentialResearchBenefits,
            institutionId: req.body.institutionId,
            projectId: req.body.projectId,
            applicatorId: proposalCreator._id,
            applicantUserIds: applicantUserIds
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
        const token = (req.headers.authorization);
        const owner = tokenManager.verifyToken(token);
    
        const proposalId = req.body.proposalId;
        if(req.body.verified != "accept" && req.body.verified != "reject"){
            return res.status(400).json({ message: 'only words accept or reject are valid.' });
        }

        const proposal = await Proposal.findById(proposalId);
        if(!proposal) {
            return res.status(400).json({ message: 'proposal not found.' });
        }
        const project = await Project.findById(proposal.projectId);
    
        if(!project) {
            return res.status(400).json({ message: 'project not found.' });
        }
    
        if(owner._id != project.ownerIds[0]){
            res.status(401).json({ message: 'you are not allowed.' });
        }
    
        project.userIds.push(proposal.applicantUserIds);
        project.userIds.push([proposal.applicatorId]);
    
        proposal.verified = req.body.verified;
        proposal.proposalReviewText = req.body.proposalReviewText;
    
        await proposal.save();
        await project.save();    
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
}

const listProposals = async function(req, res, next) {
    try{
        const token = (req.headers.authorization);
        const owner = tokenManager.verifyToken(token);
    
        if(req.body.verified != "accept" && req.body.verified != "none" && req.body.verified != "reject"){
            return res.status(400).json({ message: 'only words accept, none or reject are valid.' });
        }
        const projectId = req.body.projectId;
        const project = await Project.findById(projectId);
    
        if(!project) {
            return res.status(400).json({ message: 'project not found.' });
        }
        const proposals = project.proposalIds; 

        return res.status(401).json({proposals});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }

}



module.exports = {createProposal, updateProposal, evaluateProposal, listProposals}