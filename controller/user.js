
const loginApi = async function(req,res,next){
    console.log("log");
    return res.status(200).json({message:"mesaj" });
}
module.exports = {loginApi}