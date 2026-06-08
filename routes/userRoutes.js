import express from 'express';
const router = express.Router()
import { pageNotFound, loadLanding, loadSignup, signup, verifyOtp, resendOtp, loadLogin, login, loadHome, logout, loadForgotPassword,    
  ForgotPassword,loadForgotOtp, ForgotOtp, resendForgotOtp,loadResetPassword, ResetPassword,userProfile,loadEditProfile,editProfile,
changeEmail,verifyChangeEmail,
loadSignupOtp, } from '../controllers/user/userController.js'    
import passport from 'passport';
import upload from '../middlewares/upload.js';
import checkBlocked from '../middlewares/checkBlocked.js';
import {loadAddressBook,loadAddAddress,addAddress,loadEditAddress,editAddress,deleteAddress,setPrimaryAddress,} from '../controllers/user/addressController.js'
import {loadProductDetails} from '../controllers/user/productDetailsController.js'
import {loadShop, loadShopProducts} from '../controllers/user/shopController.js'
import { loadCart, addToCart, editCartItem, removeCartItem, addFromWishlist } from '../controllers/user/cartController.js';
import { toggleWishlist, loadWishlist, addToWishlist, removeFromWishlist, moveAllToCart } from '../controllers/user/wishlistController.js';
import { checkReviewEligibility, submitReview, getProductReviews, uploadReviewImgs } from '../controllers/user/reviewController.js';
import {userAuth,userGuest} from '../middlewares/auth.js'
import { loadCheckout, placeOrder, loadOrderSuccess } from '../controllers/user/checkoutController.js';
import { loadOrders, loadOrderDetails, loadOrderTracking, cancelItem, returnItem, cancelOrder,
        returnOrder, downloadInvoice } from '../controllers/user/orderController.js';



router.use(checkBlocked)
router.get('/pageNotFound', pageNotFound)
router.get('/', loadLanding)
router.get('/signup', userGuest, loadSignup)
router.post('/signup', userGuest, signup)
router.get('/signupOtp', userGuest, loadSignupOtp)
router.post('/verifyOtp', verifyOtp)
router.post("/resendOtp", resendOtp)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/signup' }), (req, res) => {
    req.session.user = req.user._id.toString();
    req.session.save((sessionError)=>{
        if(sessionError){
            return res.redirect('/login')
        }
        return res.redirect('/home')
    })
})
router.get('/login', userGuest, loadLogin)
router.post('/login', userGuest, login)

router.get('/logout', logout)
router.get('/forgotPassword', userGuest, loadForgotPassword)
router.post('/forgotPassword', userGuest, ForgotPassword);
router.get('/forgotOtp', userGuest, loadForgotOtp);
router.post('/forgotOtp', userGuest, ForgotOtp);
router.post('/resendForgotOtp', userGuest, resendForgotOtp);
router.get('/resetPassword', userGuest, loadResetPassword);
router.post('/resetPassword', userGuest, ResetPassword);
router.get('/home', userAuth, loadHome)
//profile
router.get('/profile',userAuth,userProfile);
router.get('/editProfile',userAuth,loadEditProfile)
router.post('/editProfile',userAuth,upload.single('profileImage'),editProfile)
router.patch('/changeEmail',userAuth,changeEmail)
router.patch('/verifyChangeEmail',userAuth,verifyChangeEmail)
//address
router.get('/addressBook',userAuth,loadAddressBook);
router.get('/addAddress',userAuth,loadAddAddress)
router.post('/addAddress',userAuth,addAddress)
router.get('/editAddress/:id',userAuth,loadEditAddress)
router.post('/editAddress/:id',userAuth,editAddress)
router.delete('/deleteAddress/:id',userAuth,deleteAddress)
router.patch('/setPrimaryAddress/:id',userAuth,setPrimaryAddress)
//shop
router.get('/shop',loadShop)
router.get('/shop/products', loadShopProducts)
//productDetail
router.get('/product/:id',loadProductDetails)
//cart
router.get('/cart',userAuth,loadCart)
router.post('/cart/add', userAuth, addToCart)
router.patch('/cart/update/:itemId', userAuth, editCartItem)
router.delete('/cart/remove/:itemId', userAuth, removeCartItem)
router.post('/cart/add-from-wishlist', userAuth, addFromWishlist)
//wishlist
router.post('/wishlist/toggle',userAuth, toggleWishlist)
router.get('/wishlist',userAuth, loadWishlist)
router.post('/wishlist/add',userAuth, addToWishlist)
router.delete('/wishlist/remove/:itemId',userAuth, removeFromWishlist)
router.post('/wishlist/move-all-to-cart',userAuth, moveAllToCart)
//review/rating
router.get('/products/:id/review/check', userAuth, checkReviewEligibility);
router.post('/product/:id/review', userAuth, uploadReviewImgs, submitReview)
router.get('/product/:id/reviews', getProductReviews)
// checkout 
router.get('/checkout', userAuth, loadCheckout)
router.post('/checkout/place-order', userAuth,placeOrder)
router.get('/orders/success/:orderId', userAuth,loadOrderSuccess)
// order 
router.get('/orders', userAuth, loadOrders)
router.get('/orders/:orderId', userAuth, loadOrderDetails)
router.get('/orders/:orderId/invoice', userAuth, downloadInvoice)
router.get('/orders/:orderId/track/:itemId', userAuth, loadOrderTracking)
router.post('/orders/:orderId/cancel-item', userAuth, cancelItem)
router.post('/orders/:orderId/return-item', userAuth, returnItem)
router.post('/orders/:orderId/cancel', userAuth, cancelOrder) 
router.post('/orders/:orderId/return', userAuth, returnOrder) 




export default router