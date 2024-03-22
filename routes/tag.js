const express = require("express");

const router = express.Router();
const {addTag, getTags} = require("../controller/tag");

router.post("/add", addTag);
router.get("/get", getTags);


module.exports = router;