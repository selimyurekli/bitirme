const express = require("express");

const router = express.Router();
const {login, signup, verifyUser} = require("../controller/user");

router.post("/login", login);
router.post("/signup", signup);
router.post("/verify-user", verifyUser);


module.exports = router;