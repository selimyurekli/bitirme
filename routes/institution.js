const express = require("express");

const router = express.Router();
const {addInstitution, getInstutitions} = require("../controller/institution");

router.post("/add", addInstitution);
router.get("/get", getInstutitions);


module.exports = router;