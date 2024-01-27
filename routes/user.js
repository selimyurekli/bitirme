const express = require("express");

const router = express.Router();
const {loginApi} = require("../controller/user");

router.get("/login", loginApi);

module.exports = router;