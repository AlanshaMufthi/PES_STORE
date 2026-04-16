import getUserId from "../helpers/getUserId.js"
import User from "../models/userModel.js"

const checkBlocked = async(req,res,next)=>{
    try{
        const userId = getUserId(req)
        if(!userId){
            return next()
        }
        const user = await User.findById(userId)
        if(!user || user.isBlocked){
            req.session.destroy()
            return res.redirect('/login')
        }
        next()
    }catch(error){
        next(error)
    }
}

export default checkBlocked