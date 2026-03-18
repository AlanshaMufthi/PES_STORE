import User from '../../models/userModel.js'



const customerInfo = async(req,res)=>{
    try {
        let search ="";
        if(req.query.search){
            search=req.query.search
        }
        let page = 1;
        if(req.query.page){
            page=req.query.page
        }
        const limit = 3;
          const userData = await User.find({
            isAdmin:false,
            $or:[
                {firstName:{$regex:search,$options:'i'}},
                {lastName:{$regex:search,$options:'i'}},
                {email:{$regex:search,$options:'i'}}
            ]
        })
        .limit(limit*1)
        .skip((page-1)*limit)
        .exec()
        
        const count = await User.find({
             isAdmin:false,
            $or:[
                {firstName:{$regex:search,$options:'i'}},
                {lastName:{$regex:search,$options:'i'}},
                {email:{$regex:search,$options:'i'}}
            ]
        }).countDocuments();

        res.render('customers',{
            customers:userData,
        })
      
    } catch (error) {
        
    }
}

export {
    customerInfo
}