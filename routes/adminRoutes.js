import express from 'express';
const router = express.Router()
import {pageNotFound,loadLogin,login,loadDashboard,logout} from '../controllers/admin/adminController.js';
import { customerInfo} from '../controllers/admin/customerController.js'
import {userAuth,adminAuth} from '../middlewares/auth.js'


router.get('/pageNotFound',pageNotFound)
router.get('/login',loadLogin)
router.post('/login',login)
router.get('/dashboard',loadDashboard)
router.get('/logout',logout)
router.get('/customers',customerInfo)



export default router