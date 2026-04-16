import Category from "../../models/categoryModel.js";
import Product from "../../models/productModel.js"


const loadCategories = async(req,res)=>{
    try {
        const search = req.query.search || ''
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 5
        const skip = (page-1)*limit

        const query = {
            ...(search && {name:{$regex:search,$options:'i'}})
        }
        
        const totalCount = await Category.countDocuments(query)
        const totalPages = Math.ceil(totalCount/limit)


        const categoriesRaw = await Category.find(query).sort({createdAt: -1}).skip(skip).limit(limit)
       
        
        const categories = await Promise.all(
            categoriesRaw.map(async(cat)=>{
                const productCount = await Product.countDocuments({category:cat._id})
                return {...cat.toObject(),productCount}
            })
        )
        res.render('categoryManagement',{
            categories,
            search,
            currentPage : page,
            totalPages,
            limit
        })

    } catch (error) {
        console.log('loadCategories error :',error)
        res.redirect('/admin/pageNotFound')
    }
}


const loadAddCategory = async(req,res)=>{
    try {
        res.render('addCategory')
    } catch (error) {
        console.log('loadAddCategory error : ',error)
        res.redirect('/admin/pageNotFound')
    }
}


const addCategory = async(req,res)=>{
    try {
        const {name,description,isBlocked,offer,offerActive}=req.body;
       

        const existing = await Category.findOne({
            name:{$regex:`${name.trim()}`,$options:'i'}
        })
        if(existing){
            return res.status(409).json({success:false,field:'name',message:'Category name already exists.'})
        }
        await Category.create({
           name: name.trim(),
           description: description.trim(),
           isBlocked : isBlocked === 'false',
           categoryOffer: parseInt(offer) || 0,
           offerActive: offerActive === true || offerActive === 'true'
        })
       return res.status(200).json({success:true, redirectUrl : '/admin/categories'})
    } catch (error) {
        console.log('addCategory error : ',error)
        // res.redirect('/admin/pageNotFound')
        return res.status(500).json({success:false,messgae:'Server error. please try again.'})
    }
}


const loadEditCategory = async(req,res)=>{
    try {
        const category = await Category.findById(req.params.id)
        if(!category){
            return res.redirect('/admin/categories')
        }
        res.render('editCategory',{category})
    } catch (error) {
        console.log('loadEditCategory error :',error)
        res.redirect('/admin/pageNotFound')
    }
}


const editCategory = async(req,res)=>{
    try {
        const {name,description,isBlocked,offer,offerActive}=req.body;
        const existing = await Category.findOne({
            name:{$regex:`^${name.trim()}`,$options:'i'},
            _id:{$ne:req.params.id}
        })
        if(existing){
            return res.status(409).json({ success: false, field: 'name', message: 'Category name already exists' })
        }
        await Category.findByIdAndUpdate(req.params.id,{
            name: name.trim(),
            description: description.trim(),
            isBlocked:isBlocked==='false',
            categoryOffer:parseInt(offer) || 0,
            offerActive: offerActive === true || offerActive === 'true'
        })
       return res.status(200).json({success : true, redirectUrl : '/admin/categories'})
    } catch (error) {
        console.log('editCategory error : ',error)
        // res.redirect('/admin/pageNotFound')
        return res.status(500).json({success:false,message : 'Server error. Please try again.'})
    }
}


const categoryStatus = async(req,res)=>{
    try {
        const category = await Category.findById(req.params.id)
        if(!category){
            return res.status(404).json({success:false,message:'Category not found'})
        }
        category.isBlocked = !category.isBlocked
        await category.save()

        res.json({success:true,isBlocked:category.isBlocked})
    } catch (error) {
        console.log('categoryStatus error : ',error)
        res.status(500).json({success:false,message:'Server Error'})
    }
}


const toggleCategoryOffer = async(req,res)=>{
    try {
        const category = await Category.findById(req.params.id)
        if(!category) return res.status(404).json({success:false,message:'Category not found.'})

        if(!category.categoryOffer || category.categoryOffer === 0){
            return res.status(400).json({success:false,message:'Set a discount % before enabling the offer'})
        }

            category.offerActive = !category.offerActive
            await category.save()

            return res.json({success:true,offerActive: category.offerActive})
               
    } catch (error) {
        console.log('toggleCategoryOffer Error : ',error)
        return res.status(500).json({success:false,message:'Server Error'})
    }
}




export {
    loadCategories,
    loadAddCategory,
    addCategory,
    loadEditCategory,
    editCategory,
    categoryStatus,
    toggleCategoryOffer,
   
}