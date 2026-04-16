import Review from "../../models/reviewModel.js";
import Product from "../../models/productModel.js";
import { v2 as cloudinary} from 'cloudinary'
import multer from "multer";


const storage = multer.memoryStorage();

const uploadReviewImgs = multer({
    storage,
    limits: { fileSize : 5 * 1024 * 1024}, // 5mb per file
    fileFilter: (req,file,cb)=>{
       if(!file.mimetype.startsWith('image/')){
        return cb(new Error('Only image files are allowed'))
       }
       cb(null,true)
    }
}).array('reviewImgs',4)

const uploadToCloudinary = (buffer, folder = 'reviews')=>
    new Promise((resolve,reject)=>{
        const stream = cloudinary.uploader.upload_stream(
            { folder, resourse_type: 'image'},
            (err, result) => (err ? reject(err) : resolve(result.secure_url))
        )
        stream.end(buffer)
    })

const checkReviewEligibility = async(req,res)=>{
    try {
        const userId = req.session.userId
        const product = req.params.id;

        if(!userId) return res.status(401).json({success:false,message:'Login required'})

            const existing = await Review.findOne({userId,productId}).lean()
            return res.json({success:true, alreadyReviewed: !!existing})
    } catch (error) {
        console.log('checkReviewEligibility Error : ', error)
        return res.status(500).json({success:false,message:'Server Error'})
    }
}


const submitReview = async(req,res)=>{
    try {
        const userId = req.session.user;
        const productId = req.params.id;

        if(!userId) return res.status(401).json({success:false,message:'Login Required'})

            const rating = Number(req.body.rating)
            const title = (req.body.title || '').trim()

            if(!rating || rating<1 || rating >5){
                return res.status(400).json({success:false,message:'Rating must be between 1 and 5'})
            }
            if(reviewComment.length<10){
                return res.status(400).json({success:false,message:'Review must be atleast 10 characters'})
            }

            const existing = await Review.findOne({userId,productId})
            if(existing){
                return res.status(400).json({success:false,message:'you have already reviewed this product '})
            }

            const product = await Product.findById(productId).select('_id').lean()
            if(!product){
                return res.status(404).json({success:false,message:'Product not found'})
            }

            let reviewImgs = [];
            if(req.files && req.files.length>0){
                reviewImgs = await Promise.all(
                    req.files.map((f)=> uploadToCloudinary(f.buffer))
                )
            }

            const review = await Review.create({
                userId, productId, rating,
                title, reviewComment, reviewImgs,
                isVerifiedPurchase : false,
            })

            await review.populate('userId', 'new avatar')

            return res.status(201).json({
                success:true,
                message:'Review submitted successfully',
                review: {
                    _id: review._id,
                    rating: review.rating,
                    title: review.title,
                    reviewComment: review.reviewComment,
                    reviewImgs: review.reviewImgs,
                    createdAt: review.createdAt,
                    useername: review.userId?.name || 'you',
                    userAvatar: review.userId?.avatar || null,
                }
            })
    } catch (error) {
        if(error.code === 11000){
            return res.status(400).json({success:false,message:'You have already reviewed this product'})
        }
        console.log('submitReview Error : ', error)
        return res.status(500).json({success:false,message:'Server error'})
    }
}


const getProductReviews = async(req,res)=>{
    try {
        const reviews = await Review.find({productId : req.params.id})
        .populate('userId','name avatar')
        .sort({createdAt:-1})
        .lean()

        const avgRating = reviews.length ? reviews.reduce((sum,r)=> sum + r.rating, 0) / reviews.length : 0;

        return res.json({
            success:true, reviews, 
            avgRating: parseFloat(avgRating.toFixed(2)),
            total:reviews.length
        })
    } catch (error) {
        console.log('getProductReviews Error : ',error)
        return res.status(500).json({success:false,message:'Server error'})
    }
}

export{
    checkReviewEligibility,
    submitReview,
    getProductReviews,
    uploadReviewImgs
}