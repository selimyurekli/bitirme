const Proposal = require('../models/proposal');
const User = require('../models/user');
const Project = require('../models/project');
const TokenManager = require('../utils/TokenManager');

const tokenManager = new TokenManager();


const createProposal = async function(req, res, next) {
    try {

        const token = (req.headers.authorization);
        const proposalCreator = tokenManager.verifyToken(token);
        const applicantUserIds = req.body.applicantUserIds;

        const collaborators = await User.find({ email: { $in: applicantUserIds } }, '_id');

        if (collaborators.length != applicantUserIds.length) {
            return res.status(400).json({ error: 'Some or all users are not found in db.' });
        }

        const newProposal = new Proposal({
            proposalText: req.body.proposalText,
            potentialResearchBenefits: req.body.potentialResearchBenefits,
            projectId: req.body.projectId,
            applicatorId: proposalCreator,
            applicantUserIds: collaborators
        });
        
        const savedProposal = await newProposal.save();
        const project = await Project.findById(savedProposal.projectId);
        const user = await User.findById(savedProposal.applicatorId);
        user.proposalIds.push(savedProposal);
        project.proposalIds.push(savedProposal);
        await user.save();
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

        if(owner != project.ownerIds[0]){
            return res.status(401).json({ message: 'you are not allowed.' });
        }
    
        //hata
        project.userIds.push(proposal.applicantUserIds);
        project.userIds.push(proposal.applicatorId);
    
        proposal.verified = req.body.verified;
        proposal.proposalReviewText = req.body.proposalReviewText;
    
        await proposal.save();
        await project.save();    
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server Error' });
    }
}

const listProposals = async function(req, res, next) {
    try{
        const token = (req.headers.authorization);
        const owner = tokenManager.verifyToken(token);
        const projectId = req.body.projectId;
        if (projectId === null || projectId === undefined || projectId === 'undefined') {
            const user = await User.findById(owner);
            let proposals = user.proposalIds; 
            proposals = await Proposal.find({ _id: { $in: proposals }});
            return res.status(200).json({proposals});
        }
        else {
            
            const project = await Project.findById(projectId);
        
            if(!project) {
                return res.status(400).json({ message: 'project not found.' });
            }
            let proposals = project.proposalIds; 
            proposals = await Proposal.find({ _id: { $in: proposals }});
            return res.status(200).json({proposals});
        }
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server Error' });
    }

}



module.exports = {createProposal, updateProposal, evaluateProposal, listProposals}