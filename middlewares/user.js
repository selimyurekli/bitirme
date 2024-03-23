const TokenManager = require('../utils/TokenManager');

const tokenManager = new TokenManager();

const isAuth = function(req, res, next) {
    const token = (req.headers.authorization);
    if(!token){
        return res.status(401).json({ message: "Not authorized. " })
    }
    const id = tokenManager.verifyToken(token)
    if(id){
        req.authanticatedUserId = id;
        next();
    }
    else {
        return res.status(401).json({message: "Not authorized. "})
    }
}   
module.exports = {isAuth}