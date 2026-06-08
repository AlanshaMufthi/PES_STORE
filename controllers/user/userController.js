import User from '../../models/userModel.js'
import nodemailer from 'nodemailer'
import bcrypt from 'bcrypt'
import getUserId from '../../helpers/getUserId.js';
import Product from '../../models/productModel.js';
import Category from '../../models/categoryModel.js';


const loadLanding = async(req,res)=>{
  
    try{
        const user = getUserId(req)
        const activeCategories = await Category.find({isBlocked:false}).select('_id').lean()
        const activeCategoryIds = activeCategories.map((c)=> c._id)

        const latestBoots = await Product.find({ collection: 'Latest', isBlocked: false, category: { $in: activeCategoryIds } }).limit(4).lean()
        const signatureBoots = await Product.find({ collection: 'Signature', isBlocked: false, category: { $in: activeCategoryIds } }).limit(3).lean()

        if(user){
            return res.redirect("/home")
        }else{
            return res.render('landing', { latestBoots, signatureBoots })
        }
        


    }catch(error){

       console.log('landing page not found')  
       res.status(404).send("not found")

    }



}

const pageNotFound = async(req,res)=>{
  
    try{

         return res.render('pageNotFound')

    }catch(error){

   res.redirect('/pageNotFound')

    }



}

const loadSignup = async (req, res) => {
    try {
        const user = getUserId(req)
        if (user) {   
            return res.redirect('/home');
        }
        return res.render('signup');
    } catch (error) {
        console.log('Signup page not loading', error);
        res.status(500).send('Internal Server Error');
    }
};



function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString()
}

async function sendVerificationEmail(email,otp){
    try {
        if(!process.env.NODEMAILER_EMAIL || !process.env.NODEMAILER_PASSWORD){
            // Fallback for local/dev environments: keep auth flow working and show OTP in server log.
            console.log(`NODEMAILER credentials are missing. OTP for ${email}: ${otp}`)
            return true
        }
        const transporter = nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            },
            tls:{
                rejectUnauthorized:false
            }
            
        })

        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:'Verify your account',
            text:`Your Otp is ${otp} `,
            html:`<b> Your OTP: ${otp} </b>`
        })

        return info.accepted.length > 0

    } catch (error) {
        
        console.log('Error sending email',error)
        return false;

    }
}

const signup = async(req,res)=>{
    try {

        
        const {firstName,lastName,phone,email,password,confirmPassword}=req.body;
        
       // Server-side validation

       if(!firstName || (firstName.match(/[a-zA-Z]/g) || []).length<3 ){
        return res.status(400).json({success:false,field:'firstName',message:'First name must be at least 3 characters'})
       }
       if(!lastName || (lastName.match(/[a-zA-Z]/g) || []).length<2){
        return res.status(400).json({success:false,field:'lastName',message:'Last name must be at least 2 characters'})
       }
       if(!phone || !/^[0-9]{10}$/.test(phone.trim())){
        return res.status(400).json({success:false,field:'phone',message:'Enter a valid 10-digit phone number'})
       }
       if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){
        return res.status(400).json({success:false,field:'email',message:'Enter a valid email'})
       }
       if(!password || !/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(password)){
        return res.status(400).json({success:false,field:'password',message:'Password must be 6+ characters with at least one letter and number'})
       }
        if(password !== confirmPassword){
            return res.status(400).json({success:false,field:'confirmPassword',message:'Passwords do not match'})
        }
        const normalizedEmail = email.trim().toLowerCase()
        const findUser = await User.findOne({email: normalizedEmail})
        if(findUser){
            return res.status(409).json({success:false,field:'email',message:'User with this email already exists'})
        }
        const otp = generateOtp()
        
        const emailSent = await sendVerificationEmail(normalizedEmail,otp)
              
        if(!emailSent){
            return res.status(500).json({success:false,message:'Unable to send OTP now. Please try again later'})
        }
        req.session.userOtp = otp;
        req.session.userData = {firstName,lastName,phone,email: normalizedEmail,password};
        
        
         console.log('otp sent',otp)

        return res.json({ success: true, redirectUrl: '/signupOtp' })
      
        

    } catch (error) {
       
        console.log('signup error',error);
        res.redirect('/pageNotFound')
    }
} 


const securePassword = async(password)=>{
try {
    const passwordHash = await bcrypt.hash(password,10)
    return passwordHash
} catch (error) {
    
}
}


const loadSignupOtp = async(req,res)=>{
    try {
        if(!req.session.userOtp) return res.redirect('/signup')
            res.render('signupOtp')
    } catch (error) {
        console.log('loadSignupOtp Error : ',error)
        res.redirect('/pageNotFound')
    }
}
const verifyOtp = async(req,res)=>{
    try {
        
        const {otp}=req.body;
        console.log(otp)

        if(otp===req.session.userOtp){
            const user = req.session.userData
            const passwordHash = await securePassword(user.password)

            const saveUserData = new User({
                firstName:user.firstName,
                lastName:user.lastName,
                phone:user.phone,
                email:user.email,
                password:passwordHash,
                profileImg:'img/Solidão____.jpg'
            })
            await saveUserData.save();
            req.session.user = saveUserData._id.toString();
            return req.session.save((sessionError)=>{
                if(sessionError){
                    console.log('Session save error after signup verify',sessionError)
                    return res.status(500).json({success:false,message:'Session error. Please login again'})
                }
                return res.json({success:true,redirectUrl:'/home'})
            })
        }else{
            res.status(400).json({success:false,message:'Invalid OTP,Please try again'})
        }

    } catch (error) {
       console.log('Error Verify OTP',error)
       res.status(500).json({success:false,message:'An error occured'}) 

    }
}

const resendOtp = async(req,res)=>{
    try {
        
        const {email}=req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})
        }
        const otp = generateOtp();
        req.session.userOtp = otp;

        req.session.save(async (error)=>{
            if(error){
                console.log('Session save error',error);
                return res.status(500).json({success:false,message:'Session error. Please try again'})
            }
            const emailSent = await sendVerificationEmail(email,otp);
            if(emailSent){
                console.log('resend OTP: ', otp)
                return res.status(200).json({success:true,message:'OTP Resent Successfully'})

            }else{
                return res.status(500).json({success:false,message:'Failed to resend OTP. Please try again'})
            }
        })
    }catch(error){
        console.log('Error resending OTP',error)
        res.status(500).json({success:false,message:'Internal Server Error'})
    }

}


const loadLogin = async(req,res)=>{
    try {
        
         const userId = getUserId(req)
         if(!userId){
            return res.render('login')
         }else{
            return res.redirect('/home')
         }

    } catch (error) {
        

         res.redirect('/pageNotFound')

    }
}

const login = async(req,res)=>{
    try {
        
       const {email,password}=req.body;
       const normalizedEmail = (email || '').trim().toLowerCase()

       if(!normalizedEmail){
        return res.render('login',{message:'Email is required'})
       }
       if(!password){
        return res.render('login',{message:'Password is required'})
       }
       
       
       const findUser = await User.findOne({isAdmin:false,email:normalizedEmail});
       
       
       if(!findUser){
        return res.render('login',{message:'User not found'})
       }
       if(findUser.isBlocked){
        return res.render('login',{message:'user is blocked by admin'})
       }
       if(findUser.googleId && !findUser.password){
        return res.render('login',{message:'This account uses Google login. Please continue with Google.'})
       }

       const passwordMatch = await bcrypt.compare(password,findUser.password)
       if(!passwordMatch){
        return res.render('login',{message:'Incorrect Password'})
       }

       req.session.user = findUser._id.toString();
       return req.session.save((sessionError)=>{
        if(sessionError){
            console.log('Session save error after login',sessionError)
            return res.render('login',{message:'Session error. Please try again'})
        }
        return res.redirect('/home')
       })

    } catch (error) {
       
        console.log('login error',error)
        res.render('login',{message:'login failed. Please try again later'})

    }
}
    

const loadHome = async(req,res)=>{
    try{
        const userId = getUserId(req)
        
        if(userId){
          const userData = await User.findOne({_id:userId})
          if(!userData || userData.isBlocked){
            delete req.session.user
            if(req.session.passport){
                delete req.session.passport
            }
            return res.redirect('/login')
          }
          const cartCount = req.session.cart ? req.session.cart.length : 0
          const activeCategories = await Category.find({isBlocked:false}).select('_id').lean()
          const activeCategoryIds = activeCategories.map((c)=> c._id)
          
          const latestBoots = await Product.find({ collection: 'Latest', isBlocked: false, category: { $in: activeCategoryIds } }).limit(4).lean()
          const signatureBoots = await Product.find({ collection: 'Signature', isBlocked: false, category: { $in: activeCategoryIds } }).limit(3).lean()

         return res.render('home',{user:userData, cartCount:cartCount, latestBoots, signatureBoots})
        }

        return res.redirect('/login')
    }catch(error){
      
        console.log('Home page not loading',error)
        res.status(500).send('Server Error')

    }
}



const logout = async(req,res)=>{
    try {
        
       req.session.destroy((error)=>{
        if(error){
            console.log('Session destuction error',error.message)
            return res.redirect('/pageNotFound')
        }
        res.clearCookie('connect.sid')
        return res.redirect('/')
       })
      

    } catch (error) {
        
      console.log('Logout error',error)
      res.redirect('/pageNotFound')


    }
}


const loadForgotPassword = async (req, res) => {
  try {
    res.render('forgotPassword', { message: null });
  } catch (error) {
    res.redirect('/pageNotFound');
  }
};

const ForgotPassword = async(req,res)=>{
    try {
        const {email}=req.body
        const user = await User.findOne({email,isAdmin:false})
        if(!user){
            return res.render('forgotPassword',{message:'No account found with this email'})
        }

        const otp = generateOtp()
        const otpExpiry = Date.now() + 10 * 60 * 1000;

        const emailSent = await sendVerificationEmail(email,otp);
        if(!emailSent){
            return res.render('forgotPassword',{message:'Failed to send OTP. Try again'})
        }

       
        req.session.forgotPassword = {email,otp,otpExpiry}

        console.log('Forgot Password OTP: ',otp)
        res.redirect('/forgotOtp')

    } catch (error) {
        console.log('postForgotPassword error: ',error)
        res.redirect('/pageNotFound')
    }
}



const loadForgotOtp = async(req,res)=>{
    try {
        if(!req.session.forgotPassword){
            return res.redirect('/forgotPassword')
        }
        res.render('forgotOtp',{message:null})
    } catch (error) {
      res.redirect('/pageNotFound')  
    }
}


const ForgotOtp = async(req,res)=>{
    try {
        const {otp} = req.body;
        const sessionData = req.session.forgotPassword;
        if(!sessionData){
            return res.redirect('/forgotPassword')
        }

       if(Date.now() > sessionData.otpExpiry){
    return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one' })
}

       if(otp !== sessionData.otp){
    return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again' })
}

        req.session.forgotPassword.otpVerified = true;
return res.json({ success: true, redirectUrl: '/resetPassword' })
    } catch (error) {
      console.log('postForgotOtp error: ',error)
      res.redirect('/pageNotFound')  
    }
}


const resendForgotOtp = async (req, res) => {
  try {
    const sessionData = req.session.forgotPassword;
    if (!sessionData) {
      return res.status(400).json({ success: false, message: 'Session expired' });
    }

    const otp = generateOtp(); 
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    req.session.forgotPassword.otp = otp;
    req.session.forgotPassword.otpExpiry = otpExpiry;
  
     const emailSent = await sendVerificationEmail(sessionData.email, otp); 
    if (emailSent) {
      console.log('Resend forgot OTP:', otp);
      res.status(200).json({ success: true, message: 'OTP resent successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to resend OTP' });
    }

  } catch (error) {
    console.log('resendForgotOtp error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};



const loadResetPassword = async (req, res) => {
  try {
    const sessionData = req.session.forgotPassword;
    if (!sessionData || !sessionData.otpVerified) {
      return res.redirect('/forgotPassword');
    }
    res.render('resetPassword', { message: null,success:null });
  } catch (error) {
    res.redirect('/pageNotFound');
  }
};



const ResetPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    const sessionData = req.session.forgotPassword;

    if (!sessionData || !sessionData.otpVerified) {
      return res.redirect('/forgotPassword');
    }

    if (password !== confirmPassword) {
      return res.render('resetPassword', { message: 'Passwords do not match' });
    }
    
     if (password.length < 6) {
      return res.render('resetPassword', { message: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await securePassword(password); 

    await User.updateOne(
      { email: sessionData.email },
      { $set: { password: hashedPassword } }
    );

    delete req.session.forgotPassword;

    return res.render('resetPassword',{
        message:null,
        success:'Password reset successfully!'
    })

  } catch (error) {
    console.log('postResetPassword error:', error);
    res.redirect('/pageNotFound');
  }
};


const userProfile = async(req,res)=>{
    try {
        const userId = getUserId(req)

        if(!userId){
            return res.redirect('/login')
        }
        const userData = await User.findById(userId)
        if(!userData){
            return res.redirect('/login')
        }
        res.render('profile',{
            user:userData,
        })
        console.log('profileImage value:', userData.profileImg)
    } catch (error) {
        console.log('error for retreive profile data',error)
        res.redirect('/PageNotFound')
    }
}


const loadEditProfile = async(req,res)=>{
    try {
        const userId = getUserId(req)
        const user = await User.findById(userId)
        res.render('editProfile',{user})
    } catch (error) {
        console.log('loadEdit error: ' , error)
        res.redirect('/pageNotFound')
    }
}



const editProfile = async(req,res)=>{
    try {
        
       const {firstName,lastName,phone,currentPassword,newPassword,confirmPassword}=req.body;
       
       const userId = getUserId(req)
    
       const updateData = {
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      phone:     phone ? phone.trim() : '',
    }
    if(req.file){
        updateData.profileImg = 'img/' + req.file.filename;
    }
    if(currentPassword || newPassword || confirmPassword){
        const userData = await User.findById(userId)
        const match = await bcrypt.compare(currentPassword,userData.password)
        if(!match){
            
            return res.render('editProfile',{user:userData,error:'Current password is incorrect'})
            
        }
        updateData.password = await securePassword(newPassword)
    }
    await User.findByIdAndUpdate(userId,{
        $set:updateData
    })
        
        
    } catch (error) {
        console.log('editProfile error:',error)
        res.redirect('/pagenotFound')
    }
}


const changeEmail = async(req,res)=>{
    try{
        const {newEmail}= req.body;

        const existing = await User.findOne({email:newEmail})
        if(existing){
            return res.json({success:false,message:'This email is already registered'})
        }

        const otp = generateOtp()
        const otpExpiry = Date.now() + 10 * 60 * 1000

        req.session.changeEmail = {newEmail,otp,otpExpiry}

        const emailSent = await sendVerificationEmail(newEmail,otp)
            if(!emailSent){
                return res.json({success:false,message:'Failed to send OTP. Please try again'
                })
            }
            console.log('Change Email OTP: ',otp);
            return res.json({success:true,message:'OTP sent successfully'})
        }catch(error){
            console.log('changeEmail Error : ',error)
            return res.status(500).json({success:false,message:'Internal server Error'})
        }
    
}

const verifyChangeEmail = async(req,res)=>{
    try {
        const {otp} = req.body;
        const sessionData = req.session.changeEmail;
        if(!sessionData){
            return res.status(400).json({success:false,message:'Session Expired. Please start again'})
        }
        if(Date.now() > sessionData.otpExpiry){
            delete req.session.changeEmail;
            return res.status(400).json({success:error,message:'OTP expired. Please request new one'})
        }
        if(otp !== sessionData.otp){
            return res.status(400).json({success:false,message:'Invalid OTP.Please try again'})
        }

        const userId = getUserId(req)

        await User.findByIdAndUpdate(userId,{
            $set:{email:sessionData.newEmail}
        })
        delete req.session.changeEmail
        return res.status(200).json({success:true,message:'Email updated successfully'})
    } catch (error) {
        console.log('VerifyChangeEmail error : ',error)
        return res.status(500).json({success:false,message:'Internal server error'})

    }
}



 export {
  loadLanding,
  pageNotFound,
  loadSignup,
  signup,
  loadSignupOtp,
  verifyOtp,
  resendOtp,
  loadLogin,
  login,
  loadHome,
  logout,
 loadForgotPassword,    
  ForgotPassword,
  loadForgotOtp,
  ForgotOtp,
  resendForgotOtp,
  loadResetPassword,
  ResetPassword,
  userProfile,
  loadEditProfile,
  editProfile,
  changeEmail,
  verifyChangeEmail,

}