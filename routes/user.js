const express = require("express");

const router = express.Router();
const { login, signup, verifyUser, userDetail } = require("../controller/user");

const { isAuth } = require('../middlewares/user');


router.post("/login", login);
router.post("/signup", signup);
router.post("/verify-user", verifyUser);
router.get("/detail", isAuth, userDetail);



module.exports = router;