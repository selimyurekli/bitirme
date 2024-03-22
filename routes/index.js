const express = require("express");
const router = express.Router();
const user = require("./user");
const project = require("./project");
const proposal = require("./proposal");
const institution = require("./institution");
const tag = require("./tag");
const {isAuth} = require('../middlewares/user');

router.use("/user", user);
router.use("/project",isAuth ,project);
router.use("/proposal",isAuth ,proposal);
router.use("/institution", institution);
router.use("/tag", tag);

module.exports = router;