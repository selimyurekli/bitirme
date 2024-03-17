const express = require("express");
const { createProposal, updateProposal, evaluateProposal, listProposals} = require("../controller/proposal");

const router = express.Router();

router.post('/create', createProposal)
router.post('/update', updateProposal)
router.post('/evaluate', evaluateProposal)
router.post('/list', listProposals)

module.exports = router;