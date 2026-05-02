import getUserId from '../helpers/getUserId.js'

 const userAuth = (req,res,next)=>{
    const userId = getUserId(req)
    if(userId){
        return next()
    }

    return res.redirect('/login')
}

 const adminAuth = (req,res,next)=>{
    if(req.session.admin && req.session.admin.isAdmin){
        return next()
    }

    return res.redirect('/admin/login')
}

const userGuest = (req,res,next)=>{
    const userId = getUserId(req)
    if(userId){
        return res.redirect('/home')
    }

    return next()
}

const adminGuest = (req,res,next)=>{
    if(req.session.admin && req.session.admin.isAdmin){
        return res.redirect('/admin/dashboard')
    }

    return next()
}

export  {
    userAuth,
    adminAuth,
    userGuest,
    adminGuest
}

