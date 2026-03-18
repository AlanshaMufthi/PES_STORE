import express from 'express';
const router = express.Router()
import { pageNotFound, loadLanding, loadSignup, signup, verifyOtp, resendOtp, loadLogin, login, loadHome, logout } from '../controllers/user/userController.js'    
import passport from 'passport';



router.get('/pageNotFound', pageNotFound)
router.get('/', loadLanding)
router.get('/signup', loadSignup)
router.post('/signup', signup)
router.post('/verifyOtp', verifyOtp)
router.post("/resendOtp", resendOtp)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
})
router.get('/login', loadLogin)
router.post('/login', login)
router.get('/home', loadHome)
router.get('/logout', logout)


export default router