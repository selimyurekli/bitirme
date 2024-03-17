const express = require("express");
const router = express.Router();
const user = require("./user");
const project = require("./project");
const proposal = require("./proposal");


router.use("/user", user);
router.use("/project", project);
router.use("/proposal", proposal);

module.exports = router;