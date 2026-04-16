import express from 'express';
const router = express.Router()
import upload from '../middlewares/upload.js';
import Product from '../models/productModel.js';
import Category from '../models/categoryModel.js';
import {pageNotFound,loadLogin,login,loadDashboard,logout} from '../controllers/admin/adminController.js';
import { customerInfo,customerStatus,} from '../controllers/admin/customerController.js'
import {adminAuth} from '../middlewares/auth.js'
import { loadCategories, loadAddCategory, addCategory, loadEditCategory, editCategory, categoryStatus,toggleCategoryOffer } from '../controllers/admin/categoryController.js'
import {loadProductManagement,loadAddProduct,addProduct,toggleVariantOffer,loadEditProduct,editProduct,productStatus} from '../controllers/admin/productController.js'

router.get('/pageNotFound',pageNotFound)
router.get('/login',loadLogin)
router.post('/login',login)
router.get('/logout',logout)
//dashboard
router.get('/dashboard',loadDashboard)
//customers
router.get('/customers',customerInfo)
router.patch('/customers/:id/toggle-status',customerStatus)
//category
router.get('/categories',loadCategories)
router.get('/categories/add',loadAddCategory)
router.post('/categories/add',addCategory)
router.get('/categories/edit/:id',loadEditCategory)
router.post('/categories/edit/:id',editCategory)
router.patch('/categories/:id/toggle-status',categoryStatus)
router.patch('/categories/:id/toggle-offer', toggleCategoryOffer)
//products
router.get('/products',loadProductManagement)
router.get('/products/add',loadAddProduct)
router.post('/products/add', upload.array('productImages', 3),addProduct)
router.patch('/products/:id/variants/:variantId/toggle-offer',toggleVariantOffer)
router.get('/products/edit/:id',loadEditProduct)
router.post('/products/edit/:id', upload.array('productImages',3), editProduct)
router.patch('/products/:id/toggle-status',productStatus)





export default router