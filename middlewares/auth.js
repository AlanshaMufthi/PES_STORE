import User from '../models/userModel.js'

 const userAuth = (req,res,next)=>{
    if(req.session.user){
        User.findById(req.session.user)
        .then((data)=>{
            if(data && !data.isBlocked){
                next()
            }else{
                res.redirect('/login')
            }
        })
        .catch((error)=>{
            console.log('Error in user auth middleware')
            res.status(500).send('Internal Server Error')
        })
    }else{
        res.redirect('/login')
    }
}

 const adminAuth = (req,res,next)=>{
    User.findOne({isAdmin:true})
    .then((data)=>{
        if(data){
            next()
        }else{
            res.redirect('/admin/login')
        }
    })
    .catch((error)=>{
        console.log('Error in admin auth middleware')
        res.status(500).send('Internal Server Error')
    })
}

export  {
    userAuth,
    adminAuth
}

