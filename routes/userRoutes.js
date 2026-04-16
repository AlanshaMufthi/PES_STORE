import express from 'express';
const router = express.Router()
import { pageNotFound, loadLanding, loadSignup, signup, verifyOtp, resendOtp, loadLogin, login, loadHome, logout, loadForgotPassword,    
  ForgotPassword,loadForgotOtp, ForgotOtp, resendForgotOtp,loadResetPassword, ResetPassword,userProfile,loadEditProfile,editProfile,
changeEmail,verifyChangeEmail, } from '../controllers/user/userController.js'    
import passport from 'passport';
import upload from '../middlewares/upload.js';
import checkBlocked from '../middlewares/checkBlocked.js';
import {loadAddressBook,loadAddAddress,addAddress,loadEditAddress,editAddress,deleteAddress,setPrimaryAddress,} from '../controllers/user/addressController.js'
import {loadProductDetails} from '../controllers/user/productDetailsController.js'
import {loadShop} from '../controllers/user/shopController.js'
import { loadCart, addToCart, editCartItem, removeCartItem, addFromWishlist } from '../controllers/user/cartController.js';
import { toggleWishlist, loadWishlist, addToWishlist, removeFromWishlist, moveAllToCart } from '../controllers/user/wishlistController.js';
import { checkReviewEligibility, submitReview, getProductReviews, uploadReviewImgs } from '../controllers/user/reviewController.js';
import {userAuth} from '../middlewares/auth.js'



router.use(checkBlocked)
router.get('/pageNotFound', pageNotFound)
router.get('/', loadLanding)
router.get('/signup', loadSignup)
router.post('/signup', signup)
router.post('/verifyOtp', verifyOtp)
router.post("/resendOtp", resendOtp)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), (req, res) => {
    req.session.user = req.user._id;
    res.redirect('/')
})
router.get('/login', loadLogin)
router.post('/login', login)

router.get('/logout', logout)
router.get('/forgotPassword', loadForgotPassword)
router.post('/forgotPassword', ForgotPassword);
router.get('/forgotOtp', loadForgotOtp);
router.post('/forgotOtp', ForgotOtp);
router.post('/resendForgotOtp', resendForgotOtp);
router.get('/resetPassword', loadResetPassword);
router.post('/resetPassword', ResetPassword);
router.get('/home', loadHome)
//profile
router.get('/profile',userProfile);
router.get('/editProfile',loadEditProfile)
router.post('/editProfile',upload.single('profileImage'),editProfile)
router.patch('/changeEmail',changeEmail)
router.patch('/verifyChangeEmail',verifyChangeEmail)
//address
router.get('/addressBook',loadAddressBook);
router.get('/addAddress',loadAddAddress)
router.post('/addAddress',addAddress)
router.get('/editAddress/:id',loadEditAddress)
router.post('/editAddress/:id',editAddress)
router.delete('/deleteAddress/:id',deleteAddress)
router.patch('/setPrimaryAddress/:id',setPrimaryAddress)
//shop
router.get('/shop',loadShop)
//productDetail
router.get('/product/:id',loadProductDetails)
//cart
router.get('/cart',loadCart)
router.post('/cart/add', addToCart)
router.patch('/cart/update/:itemId', editCartItem)
router.delete('/cart/remove/:itemId', removeCartItem)
router.post('/cart/add-from-wishlist', addFromWishlist)
//wishlist
router.post('/wishlist/toggle', toggleWishlist)
router.get('/wishlist',userAuth, loadWishlist)
router.post('/wishlist/add',userAuth, addToWishlist)
router.delete('/wishlist/remove/:itemId',userAuth, removeFromWishlist)
router.post('/wishlist/move-all-to-cart',userAuth, moveAllToCart)
//review/rating
router.get('/products/:id/review/check', userAuth, checkReviewEligibility);
router.post('/product/:id/review', userAuth, uploadReviewImgs, submitReview)
router.get('/product/:id/reviews', getProductReviews)



export default router