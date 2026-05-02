import express from 'express';
const router = express.Router()
import upload from '../middlewares/upload.js';
import Product from '../models/productModel.js';
import Category from '../models/categoryModel.js';
import {pageNotFound,loadLogin,login,loadDashboard,logout} from '../controllers/admin/adminController.js';
import { customerInfo,customerStatus,} from '../controllers/admin/customerController.js'
import {adminAuth,adminGuest} from '../middlewares/auth.js'
import { loadCategories, loadAddCategory, addCategory, loadEditCategory, editCategory, categoryStatus,toggleCategoryOffer } from '../controllers/admin/categoryController.js'
import {loadProductManagement,loadAddProduct,addProduct,toggleVariantOffer,loadEditProduct,editProduct,productStatus} from '../controllers/admin/productController.js'

router.get('/pageNotFound',pageNotFound)
router.get('/login',adminGuest,loadLogin)
router.post('/login',adminGuest,login)
router.get('/logout',adminAuth,logout)
//dashboard
router.get('/dashboard',adminAuth,loadDashboard)
//customers
router.get('/customers',adminAuth,customerInfo)
router.patch('/customers/:id/toggle-status',adminAuth,customerStatus)
//category
router.get('/categories',adminAuth,loadCategories)
router.get('/categories/add',adminAuth,loadAddCategory)
router.post('/categories/add',adminAuth,addCategory)
router.get('/categories/edit/:id',adminAuth,loadEditCategory)
router.post('/categories/edit/:id',adminAuth,editCategory)
router.patch('/categories/:id/toggle-status',adminAuth,categoryStatus)
router.patch('/categories/:id/toggle-offer', adminAuth, toggleCategoryOffer)
//products
router.get('/products',adminAuth,loadProductManagement)
router.get('/products/add',adminAuth,loadAddProduct)
router.post('/products/add', adminAuth, upload.array('productImages', 3),addProduct)
router.patch('/products/:id/variants/:variantId/toggle-offer',adminAuth,toggleVariantOffer)
router.get('/products/edit/:id',adminAuth,loadEditProduct)
router.post('/products/edit/:id', adminAuth, upload.array('productImages',3), editProduct)
router.patch('/products/:id/toggle-status',adminAuth,productStatus)





export default router