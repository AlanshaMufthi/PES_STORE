import User from '../../models/userModel.js'
import nodemailer from 'nodemailer'
// import dotenv from 'dotenv';
// dotenv.config()
import bcrypt from 'bcrypt'






const loadLanding = async(req,res)=>{
  
    try{
        let user=req.session.user||req.session.passport?.user

        if(user){
            res.redirect("/home")
        }else{

            return res.render('landing')
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
        let user =req.session.user||req.session.passport?.user
        if (user) {
            
            return res.render('signup', { message: 'You are already logged in.' });
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
        console.log(process.env.NODEMAILER_EMAIL)
            console.log(process.env.NODEMAILER_PASSWORD)

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
        if(password !== confirmPassword){
            return res.render('signup',{message:'Password do not match'});
        }
        const findUser = await User.findOne({email})
        if(findUser){
            return res.render('signup',{message:'User with this email already exist'});
        }
        const otp = generateOtp()
        
        const emailSent = await sendVerificationEmail(email,otp)

        if(!emailSent){
            return res.json('email-error')
        }

        req.session.userOtp = otp;
        req.session.userData = {firstName,lastName,phone,email,password};

        res.render('signupOtp')
        console.log('otp sent',otp)

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
                password:passwordHash
            })
            await saveUserData.save();
            req.session.user = saveUserData._id;
            res.json({success:true,redirectUrl:'/home'})
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

        const emailSent = await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log('resend otp:',otp)
            res.status(200).json({success:true,message:'OTP Resend Successfully'})
        }else{
            res.status(500).json({success:false,message:'Failed to resend OTP.Please try again'})
        }

    } catch (error) {
        console.log('Error resending OTP',error)
        res.status(500).json({success:false,message:'Internal Server Error'})
    }
}


const loadLogin = async(req,res)=>{
    try {
        
         if(!req.session.user){
            return res.render('login')
         }else{
            res.redirect('/')
         }

    } catch (error) {
        

         res.redirect('/pageNotFound')

    }
}

const login = async(req,res)=>{
    try {
        

       const {email,password}=req.body;
       console.log("sas",email,password);
       
       const findUser = await User.findOne({isAdmin:0,email:email});
       console.log(findUser);
       
       if(!findUser){
        return res.render('login',{message:'User not found'})
       }
       if(findUser.isBlocked){
        return res.render('login',{message:'user is blocked by admin'})
       }

       const passwordMatch = await bcrypt.compare(password,findUser.password)
       if(!passwordMatch){
        return res.render('login',{message:'Incorrect Password'})
       }

       req.session.user = findUser._id;
       res.redirect('/home')

    } catch (error) {
       
        console.log('login error',error)
        res.render('login',{message:'login failed. Please try again later'})

    }
}
    

const loadHome = async(req,res)=>{
    try{
        const user  = req.session.user||req.session.passport?.user
        
        if(user){
          const userData = await User.findOne({_id:user._id})
          const cartCount = req.session.cart ? req.session.cart.length : 0
         res.render('home',{user:userData,cartCount:cartCount})
        }
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

        return res.redirect('/login')
       })
      

    } catch (error) {
        
      console.log('Logout error',error)
      res.redirect('/pageNotFound')


    }
}



 export {
  loadLanding,
  pageNotFound,
  loadSignup,
  signup,
  verifyOtp,
  resendOtp,
  loadLogin,
  login,
  loadHome,
  logout
}