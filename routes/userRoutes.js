import express from 'express';
const router = express.Router()
import userController from '../controllers/user/userController.js'    

router.get('/',userController.loadLanding)
router.get('/pageNotFound',userController.pageNotFound)



export default {router,pageNotFound}