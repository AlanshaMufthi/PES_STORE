import User from '../../models/userModel.js';
import bcrypt from 'bcrypt'

const pageNotFound = async(req,res)=>{
  try {
      res.render('pageNotFound')
  } catch (error) {
    res.redirect('/admin/pageNotFound')
  }
}

 const loadLogin = (req,res)=>{
    if(req.session.admin){
        return res.redirect('/admin/dashboard')
    }
    res.render('adminLogin',{message:null})
}

 const login = async(req,res)=>{
    try {
        const {email,password}=req.body;
        const admin = await User.findOne({email,isAdmin:true})
        if(admin){
            const passwordMatch = await bcrypt.compare(password,admin.password)
            if(passwordMatch){
                req.session.admin = {
                    id: admin._id,
                    isAdmin: true
                };
                return res.redirect('/admin/dashboard')
            }else{
                return res.redirect('/admin/login')
            }

        }else{
            return res.redirect('/admin/login')
        }
    } catch (error) {
        console.log('login error ',error)
        return res.redirect('/pageNotFound')
    }
}


 const loadDashboard = async(req,res)=>{
    
    if(req.session.admin){
      
        try {
            
            return res.render('dashboard')
        } catch (error) {
            return res.redirect('/admin/pageNotFound')
        }
    }

    return res.redirect('/admin/login')
}

const logout = async(req,res)=>{
    try {
        req.session.destroy(error=>{
            if(error){
                console.log('Error destroying session',error)
                return res.redirect('/admin/pageNotFound')
            }
            res.clearCookie('connect.sid')
            res.redirect('/admin/login')
        })
    } catch (error) {
       console.log('unexpected error during logout')
       res.redirect('/admin/pageNotFound') 
    }
}


export {
    pageNotFound,
    loadLogin,
    login,
    loadDashboard,
    logout,
}

