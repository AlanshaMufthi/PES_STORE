import Product from "../../models/productModel.js";
import Cart from "../../models/cartModel.js";
import Wishlist from "../../models/wishlistModel.js";
import Review from "../../models/reviewModel.js";


const loadProductDetails = async(req,res)=>{
    try {
        const product = await Product.findById(req.params.id)
        .populate('category','name')
        .lean()

        if(!product || product.isBlocked){
            req.flash?.('error','This product is no longer available')
            return res.redirect('/shop')
        }
        //  // stock info
        const hasStock = product.variants.some(v=> v.status==='onStock' && v.stock>0)
        const isFullyArchived = product.variants.every(v=> v.status === 'archived')

        //breadcrumbs
        const breadcrumbs = [
            {label: 'Home', href: '/'},
            {label: 'Shop', href: '/shop'},
            {label: product.category?.name || 'products',
                href: `/shop?category=${product.category?._id}`
            },
            {label: product.productname, href: null}
        ]

        const relatedProducts = await Product.find({
            _id: {$ne : product._id},
            category : product.category?._id,
            isBlocked : false
        })
        .limit(4)
        .select('productname productImage variants brands')
        .lean()

        //build size-varaint map
        const sizeVariantMap = []
        for(const variant of product.variants){
            const sizes = Array.isArray(variant.size) ? variant.size : variant.size ? [variant.size] : []

            for(const size of sizes){
                if(!size) continue
                sizeVariantMap.push({
                    size,
                    variantId: variant._id,
                    stock: variant.stock,
                    status: variant.status,
                    productPrice: variant.productPrice,
                    offerPrice: variant.offerPrice,
                    discountPct: variant.discountPercentage || 0,
                    sellingPrice : variant.offerActive ? variant.offerPrice : variant.productPrice,
                    available: variant.status === 'onStock' && variant.stock>0,
                    archived: variant.status === 'archived'
                })
            }
        }

        const firstAvailable = sizeVariantMap.find(s=> s.available) || sizeVariantMap[0] || null

        const cart = await Cart.findOne({userId:req.session.user}).lean()
        const cartCount = cart ? cart.items.length : 0

        //wishlist state
        let inWishlist = false;
        if(req.session?.user){
            const wishlist = await Wishlist.findOne({
                userId: req.session.user
            }).lean()

            if(wishlist){
                inWishlist = wishlist.products?.some(i=> i.productId?.toString() === product._id.toString()) || false
            }
        }

        //review/rating
       const reviews = await Review.find({productId: product._id})
       .populate('userId','new avatar')
       .sort({createdAt: -1})
       .lean()
        const avgRating = reviews.length ? reviews.reduce((s,r)=> s + r.rating,0) / reviews.length : 0

        const highlights = [
            product.brand && `Brand: ${product.brand}`,
            product.collection && `Collection: ${product.collection}`,
            product.gender && `Gender: ${product.gender}`,
            product.category?.name && `Category: ${product.category.name}`
        ].filter(Boolean)

        return res.render('productDetails',{
            page:'shop',
            product,
            breadcrumbs,
            relatedProducts,
            reviews,
            avgRating: parseFloat(avgRating.toFixed(2)),
            sizeVariantMap,
            isLoggedIn: req.session?.user ? true : false,
            firstAvailable,
            hasStock,
            isFullyArchived,
            cartCount,
            searchQuery : req.query.q || '',
            inWishlist,
            highlights
        })


    } catch (error) {
        console.log('loadProductDetails Error : ',error)
        if(error.name === 'CastError' || error.kind === 'ObjectId'){
            return res.redirect('/shop')
        }
        res.redirect('/pageNotFound')
    }
}

export { loadProductDetails }