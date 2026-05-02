import Wishlist from "../../models/wishlistModel.js";
import Product from "../../models/productModel.js";
import Cart from "../../models/cartModel.js";

const MAX_PER_ITEM = 5

const loadWishlist = async(req,res)=>{
    try {
        const wishlist = await Wishlist.findOne({userId : req.session.user})
        .populate({
            path:'products.productId',
            select:'productname productImage variants brand isBlocked category',
            populate:{ path:'category', select:'isBlocked', match:{ isBlocked:false } }
        })
        .lean()

        const wishlistItems = wishlist ? wishlist.products.filter((i)=> i.productId && i.productId.category) : []

        const cart = await Cart.findOne({userId : req.session.user}).lean()
        const cartCount = cart ? cart.items.length : 0

        return res.render('wishList',{page:'wishList',wishlistItems,cartCount})
    } catch (error) {
        console.log('loadWishlist Error : ',error)
        res.redirect('/pageNotFound')
    }
}


const addToWishlist = async(req,res)=>{
    try {
        const {productId} = req.body;
       
        if(!productId){
            return res.status(400).json({success:false,message:'Product ID required'})
        }

        // check product exist and not blocked
        const product = await Product.findById(productId).populate({ path:'category', select:'isBlocked', match:{ isBlocked:false } }).lean()
        if(!product || product.isBlocked || !product.category) return res.status(400).json({success:false,message:'Product is Unavailable'})

        let wishlist = await Wishlist.findOne({userId : req.session.user})
        if(!wishlist){
            wishlist = await Wishlist.create({userId : req.session.user, products:[]})
        }

        //already in wishlist
        const already = wishlist.products.some((i)=> i.productId.toString() === productId)
        if(already) return res.json({success:false,message:'Already in wishList'})

            wishlist.products.push({productId})
            await wishlist.save()

            return res.json({success:true,message:'Added to wishlist!',count : wishlist.products.length})

    } catch (error) {
        console.log('addToWishlist Error : ',error)
        return res.status(500).json({success:false,message:'Server error'})
    }
}


const removeFromWishlist = async(req,res)=>{
    try {
        const wishlist = await Wishlist.findOne({userId : req.session.user})
        if(!wishlist) return res.status(404).json({success:false,message:'Wishlist not found.'})

            const before = wishlist.products.length
            wishlist.products = wishlist.products.filter((i)=>i._id.toString() !== req.params.itemId)

            if(wishlist.products.length === before) return res.status(404).json({success:false,message:'Item not found.'})

                await wishlist.save()
                return res.json({success:true,count:wishlist.products.length})

    } catch (error) {
        console.log('removeFromWishlist Error : ',error)
        return res.status(500).json({success:false,message:'Server Error'})
    }
}


const moveAllToCart = async(req,res)=>{
    try {
        const wishlist = await Wishlist.findOne({userId : req.session.user})
        .populate('products.productId', 'productname variants isBlocked')

        if(!wishlist?.products?.length) return  res.json({success:false,message:'Wishlist is empty'})
        
        let cart = await Cart.findOne({userId : req.session.user})
        if(!cart) cart = await Cart.create({userId : req.session.user,items : []})

            const skipped = []
            const movedIds = []

    for(const w of wishlist.products){
        const product = w.productId
        if(!product || product.isBlocked){
            skipped.push(product?.productname || 'Unknown')
            continue
        }

        const variant = product.variants.find(v=> v.status === 'onStock' && v.stock>0)
        if(!variant){
            skipped.push(product.productname)
            continue
        }

        const size = variant.size?.[0]
        if(!size){
            skipped.push(product.productname)
            continue
        }

        const variantId = variant._id.toString()
        const unitPrice = variant.offerActive ? variant.offerPrice : variant.productPrice

        const existing = cart.items.find(i=>
            i.productId.toString() === product._id.toString() &&
            i.variantId.toString() === variantId &&
            i.size === size
        )
        if(existing){
            const newQty = existing.quantity + 1
            if(newQty <=  MAX_PER_ITEM && newQty <= variant.stock){
                existing.quantity = newQty
                existing.totalPrice = existing.price * newQty
            }else{
                skipped.push(product.productname)
                continue
            }
        }else{
            cart.items.push({
                productId : product._id,
                variantId,
                size,
                quantity: 1,
                price: unitPrice,
                totalPrice: unitPrice,
                status: 'onStock'
            })
        }
        movedIds.push(product._id.toString())
    }

    await cart.save()
    wishlist.products = wishlist.products.filter(i=> !movedIds.includes(i.productId?._id?.toString()))

    await wishlist.save()

    const message = skipped.length ? `Moved to cart. Could not add : ${skipped.join(', ')}` : 'All products moved to cart'

    return res.json({success:true,message,cartCount: cart.items.length})
    }catch (error){
        console.log('moveAllToCart Error: ',error)
        return res.status(500).json({success:false,message:'Server Error'})
    }

}


const toggleWishlist = async (req, res) => {
    //temp
    
    
    
    try {
        
        if (!req.session || !req.session.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Please login to add to wishlist',
                requireLogin: true 
            });
        }
        
        const userId = req.session.user;
        
        console.log('✅ toggleWishlist HIT')
        console.log('session:', req.session)
        console.log('body:', req.body)

        const { productId, action } = req.body
        if (!productId) return res.status(400).json({ success: false, message: 'Product ID required' })

        const product = await Product.findById(productId).populate({ path:'category', select:'isBlocked', match:{ isBlocked:false } }).lean()
        if (!product || product.isBlocked || !product.category)
            return res.status(400).json({ success: false, message: 'Product unavailable' })

        let wishlist = await Wishlist.findOne({ userId })
        if (!wishlist)
            wishlist = await Wishlist.create({ userId, products: [] })

        if (action === 'add') {
            const already = wishlist.products.some(i => i.productId.toString() === productId)
            if (!already) wishlist.products.push({ productId })
        } else {
            wishlist.products = wishlist.products.filter(i => i.productId.toString() !== productId)
        }

        await wishlist.save()
        return res.json({ success: true, count: wishlist.products.length })

    } catch (error) {
        console.log('toggleWishlist Error:', error)
        return res.status(500).json({ success: false, message: 'Server error' })
    }
}


export {
    loadWishlist,
    addToWishlist,
    removeFromWishlist,
    moveAllToCart,
    toggleWishlist

}



