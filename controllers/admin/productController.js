import { v2 as cloudinary} from  'cloudinary'
import Product from '../../models/productModel.js'
import Category from '../../models/categoryModel.js'


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key : process.env.CLOUDINARY_API_KEY,
    api_secret : process.env.CLOUDINARY_API_SECRET,
})

const uploadBufferToCloudinary = (buffer,index)=>{
    if(!buffer || buffer.length === 0){
        return Promise.reject(new Error(`Buffer for image ${index} is empty`))
    }
    return new Promise((resolve,reject)=>{
        const stream = cloudinary.uploader.upload_stream(
            {
            folder : 'products',
            public_id : `product_${Date.now()}_${index}`,
            resourse_type : 'image',
            allowed_formats : ['jpg','jpeg','png','webp'],
            transformation : [{ width:600,height:600,crop:'fill',quality:'auto'}],

        },
        (error,result)=>{
            if(error) return reject(error)
                resolve(result.secure_url)
        }

    )
    stream.end(buffer)
    })
}


const deleteFromCloudinary = async(imageUrl)=>{
    try {
        const parts = imageUrl.split('/')
        const filename = parts[parts.length-1].split('.')[0]
        const folder = parts[parts.length-2]
        await cloudinary.uploader.destroy(`${folder}/${filename}`)
    } catch (error) {
       console.log('Cloudinary delete error (non-fatal) : ',error) 
    }
}

const parseVariants = (variantsRaw = {})=>{
    if(!variantsRaw || typeof variantsRaw !== 'object') return []
    return Object.values(variantsRaw)
    .map(v=>{
        const size = v.sizes ? String(v.sizes).split(',').map(s=>s.trim()).filter(Boolean) : []
        const status = v.status || 'onstock'
        const stock = parseInt(v.stock) || 0
        const productPrice = parseFloat(v.basePrice) || 0
        const discountPercentage =parseFloat(v.discountPercentage) || 0
        const offerPrice = parseFloat(
            (productPrice - (productPrice * discountPercentage) / 100).toFixed(2)
        )
        return {
            size,
            status,
            stock ,
            productPrice,
            discountPercentage,
            offerPrice,
            offerActive : v.offerActive === 'true'
        }
    })
    .filter(v=> v.size.length>0)
}


const loadProductManagement = async(req,res)=>{
    try {
        const search = req.query.search || ''
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10
        const skip = (page-1)*limit

        const query = search ? {productname:{$regex : new RegExp(search, 'i')}} : {}

        const [totalCount,products] = await Promise.all([
            Product.countDocuments(query),
            Product.find(query)
            .populate('category')
            .sort({createdAt : -1})
            .skip(skip)
            .limit(limit)
        ])

        const totalPages = Math.ceil(totalCount/limit)

        res.render('productManagement',{products,totalCount,currentPage:page,totalPages,limit,search})

    } catch (error) {
        console.log('loadProductManagement Error : ',error)
        res.redirect('/admin/pageNotFound')
    }
}


const loadAddProduct = async(req,res)=>{
    try {
        const categories = await Category.find({isBlocked : false})
        res.render('addProduct',{categories,error:null})
    } catch (error) {
        console.log('loadAddProduct Error : ',error)
        res.redirect('/admin/pageNotFound')
    }
}


const addProduct = async(req,res)=>{
    try {
        const {name,brand,gender,category,collection,description} = req.body;

        if(!name?.trim() || !brand || !gender || !category || !collection || !description?.trim()){
            return res.status(400).json({success:false,field:'general',message:'All fields are required'})
        }

        const uploadFiles = req.files || []
        if(uploadFiles.length <3){
            return res.status(400).json({success:false,field:'images',message:'Please upload atleast 3 images'})
        }

        const variants = parseVariants(req.body.variants)
        if(variants.length === 0){
            return res.status(400).json({success:false,field:'variants',message:'Please add atleast one variant'})
        }

        for(const v of variants){
            if(v.productPrice <=0){
                return res.status(400).json({success:false,fiels:'variants',message:'Base price must be greater than zero'})
            }
            if(v.discountPercentage <0 || v.discountPercentage >= 100){
                return res.status(400).json({success:false,field:'variants',message:'Discount must be 0 nad 99'})
            }
            if(v.stock >50){
                return res.status(400).json({success:false,field:'variants',message : 'Stock cannot exceed 50 per variant'})
            }
            if(v.offerActive && v.discountPercentage === 0){
                return res.status(400).json({success:false,field:'variants',message:'Cannot activate offer on a variant with 0% discount'})
            }
        }

        const duplicate  = await Product.findOne({
            productname : {$regex: new RegExp(`^${name.trim()}$`,'i')},
            brand,gender
        })
        if(duplicate){
            return res.status(409).json({success:false,field:'name',message:'A product with same name,brand,gender already exists'})
        }
         
        const productImage = await Promise.all(
            uploadFiles.map((f,i)=>uploadBufferToCloudinary(f.buffer,i))
        )

        await Product.create({
            productname : name.trim(),
            brand,gender,category,collection,
            description : description.trim(),
            productImage,
            variants,
            isBlocked : false,
        })

        return res.status(200).json({success:true,redirectUrl : '/admin/products?success=added'})

    } catch (error) {
        console.log('addProduct Error : ',error)
        return res.status(500).json({success:false,field:'general',message:'Something went Wrong. Please try again.'})
    }
}


const loadEditProduct = async(req,res)=>{
    try {
        const [product,categories] = await Promise.all([
            Product.findById(req.params.id).populate('category'),
            Category.find({isBlocked:false}),
        ])

        if(!product) return res.redirect('/admin/products')
            res.render('editProduct',{product,categories,error:null})
    } catch (error) {
        console.log('loadEditProduct Error : ',error)
        res.redirect('/admin/pageNotFound')
    }
}


const editProduct = async(req,res)=>{
    const renderError = async(msg)=>{
        const [product,categories] = await Promise.all([
            Product.findById(req.params.id).populate('category'),
            Category.find({isBlocked : false})
        ])

        return res.render('editProduct',{product,categories,error:msg})
    }

    try {
        // const {name,brand,gender,category,collection,description} = req.body;

        // FIX 4: a version of this file had `body.existingImage0` (missing `req.`)
        // Explicitly reading from req.body to make this impossible to miss.
        const name        = req.body.name?.trim()
        const brand       = req.body.brand
        const gender      = req.body.gender
        const category    = req.body.category
        const collection  = req.body.collection
        const description = req.body.description?.trim()
 
        const existingImage0 = req.body.existingImage0?.trim() || null
        const existingImage1 = req.body.existingImage1?.trim() || null
        const existingImage2 = req.body.existingImage2?.trim() || null

        if(!name?.trim() || !brand || !gender || !category || !collection || !description?.trim()){
            return renderError('All fields are required')
        }
        
        const variants = parseVariants(req.body.variants)
        if(variants.length === 0){
            return renderError('Please add atleast one variant')
        }

        for(const v of variants){
            if(v.productPrice <=0) return renderError('Base price must be greater than zero')
            if(v.discountPercentage <0 || v.discountPercentage >=100) return renderError('Discount must be between 0 and 99')
            if(v.stock >50) return renderError('Stock cannot exceed 50 per variant')
            if(v.offerActive && v.discountPercentage ===0)return renderError('Cannot activate offer on a variant with 0% discount')
        }

        const duplicate = await Product.findOne({
            _id : {$ne: req.params.id},
            productname : {$regex : new RegExp(`^${name.trim()}$`,'i')},
            brand,gender
        })
        if(duplicate) return renderError('Another product with the same name,brand and gender already exists')

        const existing = [
            existingImage0,
            existingImage1,
            existingImage2
        ]
        const resolved = [...existing]
        const uploadedFiles = req.files || []
        

        await Promise.all(
            uploadedFiles.map(async(f,uploadIdx)=>{
                const match = f.originalname.match(/product_image_(\d+)/)
                const slotIdx = match ? parseInt(match[1]) : uploadIdx
                const newUrl = await uploadBufferToCloudinary(f.buffer,slotIdx)
                if(existing[slotIdx]) await deleteFromCloudinary(existing[slotIdx])
                    resolved[slotIdx] = newUrl
            })
        )

        const productImage = resolved.filter(Boolean)
        if(productImage.length<3) return renderError('Please ensure at least 3 images are present')
        
            await Product.findByIdAndUpdate(req.params.id,{
                productname: name.trim(),
                brand,gender,category,collection,
                description: description.trim(),
                productImage,variants
            })

            res.redirect('/admin/products?success=updated')

    } catch (error) {
        console.log('editProduct Error : ',error)
        return renderError('Somthing went wrong.Please try again.')
    }
}


const productStatus = async(req,res)=>{
    try {
        const product = await Product.findById(req.params.id)
        if(!product){
            return res.status(404).json({success:false,message:'Product not found'})
        }

        const newStatus = !product.isBlocked
        
        await Product.findByIdAndUpdate(req.params.id,{isBlocked:newStatus},{runValidators:false})
        res.json({success:true,isBlocked: newStatus})
    } catch (error) {
        
            console.log('productStatus Error : ',error)
            res.status(500).json({success:false,message:'Server error'})
        }
    }



const toggleVariantOffer = async(req,res)=>{
    try {
        const product = await Product.findById(req.params.id)
        if(!product){
            return res.status(404).json({success:false,message:'Product Not Found'})
        }

        const variant = product.variants.id(req.params.variantId)
        if(!variant){
            return res.status(404).json({success:false,message:'Variant not found'})
        } 
        if(!variant.offerActive && variant.discountPercentage === 0){
            return res.status(400).json({success:false,message:'Set a discount percentage on this variant before activating the offer '})
        }

        variant.offerActive = !variant.offerActive
        await product.save({validateModifiedOnly : true})

        res.json({success:true,offerActive:variant.offerActive, variantId : variant._id})

    } catch (error) {
        console.log('toggleVariantOffer Error : ',error)
        res.status(500).json({success:false,message:'Server error'})
    }
}

export {
    loadProductManagement,
    loadAddProduct,
    addProduct,
    toggleVariantOffer,
    loadEditProduct,
    editProduct,
    productStatus
}