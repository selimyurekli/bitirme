const express = require("express");
const router = express.Router();
const user = require("./user");
const project = require("./project");
const proposal = require("./proposal");
const institution = require("./institution");
const tag = require("./tag");
const {isAuth} = require('../middlewares/user');

router.use("/user", user);
router.use("/project",isAuth ,project); //projeye kullanıcı pdf ekleyebilir. proje detayı için. SHA 256 kullan tcler için anonimleştirirken. aynı kullanıcılar için aynı hash çıktısı almalı.
router.use("/proposal",isAuth ,proposal);//proposal için dosya yükleme
router.use("/institution", institution);
router.use("/tag", tag);

module.exports = router;