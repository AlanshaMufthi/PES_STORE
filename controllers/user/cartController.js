import Cart from '../../models/cartModel.js'
import Product from '../../models/productModel.js'
import Category from '../../models/categoryModel.js'
import Wishlist from '../../models/wishlistModel.js'

const MAX_PER_ITEM = 5;

const isVariantAvailable = (variant)=>{
    if(!variant) return false

    const status = (variant.status || '').toString().toLowerCase()
    if(status === 'archived') return false
    
    // If status is outofstock but we have stock, it's actually available
    // unless the admin explicitly archived it.
    return Number(variant.stock) > 0
}

const validateVariant = async(productId, variantId, size, requiredQty = 1)=>{
    const product = await Product.findById(productId).lean()

    if(!product) return {ok : false, message : 'Product not found.'}
    if(product.isBlocked) return {ok : false, message : `"${product.productname}" is unavailable.`}
    if(!product.category) return {ok:false, message:'Product category is unavailable.'}

    const category = await Category.findById(product.category).lean()
    if(!category || category.isBlocked) return {ok:false, message:'Product category is unavailable.'}


const variant = product.variants.find((v)=> v._id.toString() === variantId.toString())

if(!variant) return {ok:false,message:'Variant not found.'}
if(variant.status === 'archived') return {ok:false,message:'This variant is no longer available'}
if(variant.stock <= 0) return {ok:false,message:'This item is out of stock'}
if(!variant.size.includes(size)) return {ok:false,message:`Size ${size} is not available`}
if(variant.stock < requiredQty) {
    return {ok:false,message:`Only ${variant.stock} unit(s) left in stock.`}
}
return {ok:true,product,variant}

}

const getOrCreateCart = async(userId)=>{
    let cart = await Cart.findOne({userId})
    if(!cart) cart = await Cart.create({userId,items : []})
        return cart;
}


const loadCart = async(req,res)=>{
    try {
        const cart = await Cart.findOne({userId : req.session.user})
         .populate({
            path:'items.productId',
            select:'productname productImage variants isBlocked brand category',
            populate:{ path:'category', select:'isBlocked', match:{ isBlocked:false } }
         })
        

        if(!cart || !cart.items.length){
            return res.render('cart',{
                page : 'cart',cartItems : [], subtotal : 0, hasUnavailable : false, cartCount : 0
            })
        }

         let hasUnavailable = false;
         let cartNeedsUpdate = false;

         const cartItems = cart.items
         .filter((items)=> items.productId && items.productId.category)
         .map((items)=>{
            const product = items.productId;
            const variant = product.variants?.find((v)=> v._id.toString() === items.variantId?.toString())

            // Live availability check against real-time stock
            const stockAvailable = variant?.stock ?? 0
            const isOutOfStock = stockAvailable <= 0
            const unavailable = product.isBlocked || !variant || variant.status === 'archived' || isOutOfStock

            if(unavailable) hasUnavailable = true;

            // If this item was 'onstock' but live stock is now 0, mark it in the DB
            if(isOutOfStock && (items.status || '').toLowerCase() === 'onstock'){
                items.status = 'outOfStock'
                cartNeedsUpdate = true
            }
            // If variant was restocked (stock > 0) but item was 'outofstock', refresh it
            if(!isOutOfStock && !product.isBlocked && variant?.status !== 'archived'
               && (items.status || '').toLowerCase() === 'outofstock'){
                items.status = 'onStock'
                cartNeedsUpdate = true
            }

            return {
                ...items.toObject ? items.toObject() : items,
                product,
                variant,
                quantity : items.quantity || 0,
                stockAvailable,
                unavailable,
                livePrice : variant?.offerActive ? variant.offerPrice : variant?.productPrice
            }
         })

         if(cartNeedsUpdate) await cart.save()

         const subtotal = cartItems
         .filter((i)=> !i.unavailable)
         .reduce((sum,i)=>{
            const price = Number(i.price) || 0
            const qty = Number(i.quantity) || 0
            return sum + price * qty
         },0)
       

         return res.render('cart',{page:'cart',cartItems,subtotal,hasUnavailable,cartCount: cartItems.filter(i=> !i.unavailable).length})

    } catch (error) {
        console.log('loadCart Error : ',error)
        res.redirect('/pageNotFound')
    }
}



const addToCart = async(req,res)=>{
    
    try {
        if(!req.session || !req.session.user){
            return res.status(401).json({success:false, message:'Please login to continue.'})
        }
        const {productId,variantId,size,quantity=1} = req.body;
        const qty = Math.max(1,parseInt(quantity))

        if(!productId || !variantId || !size){
            return res.status(400).json({success:false,message:'Product, variant and sizes are required'})
        }

        //validate

        const {ok,message,product,variant} = await validateVariant(productId,variantId,size,qty)
        if(!ok) return res.status(400).json({success:false,message})

            const cart = await getOrCreateCart(req.session.user)

            const existing = cart.items.find((i)=> 
                i.productId.toString() === productId &&
            i.variantId.toString() === variantId &&
            i.size === size
            )

            const unitPrice = variant.offerActive ? variant.offerPrice : variant.productPrice
   

            if(existing){
                const existingQty = parseInt(existing.quantity) || 0
                const newQty = existingQty + qty

                if(newQty > MAX_PER_ITEM){
                    return res.status(400).json({success:false,message:`Maximum ${MAX_PER_ITEM} units allowed per item.`})
                }
                if(newQty > variant.stock){
                    return res.status(400).json({success:false,message:`Only ${variant.stock} unit(s) in stock.`})
                }

                existing.quantity = newQty
                existing.price = unitPrice     // refresh price
                existing.totalPrice = unitPrice * newQty
                existing.status = 'onStock'
            }else{
                if(qty > MAX_PER_ITEM){
                    return res.status(400).json({success:false,message:`Maximum ${ MAX_PER_ITEM} units per item.`})
                }
                cart.items.push({
                    productId,variantId,size,
                    quantity : qty,
                    price : unitPrice,
                    totalPrice : unitPrice * qty,
                    status : 'onStock'

                })
            }

            await cart.save()

            //remove form wihlist if present
            await Wishlist.updateOne({userId : req.session.user},{$pull : {products : {productId}}})

            return res.json({success:true,message:'Added to cart!',cartCount : cart.items.length})
    } catch (error) {
       console.log('addToCart Error : ',error)
       return res.status(500).json({success:false,message:'Server Error.Please try again.'})        
    }
}


const editCartItem = async(req,res)=>{
    try {
        if(!req.session || !req.session.user){
            return res.status(401).json({success:false, message:'Please login to continue.'})
        }
        const newQty = parseInt(req.body.quantity)
        if(!newQty || newQty < 1){
            return res.status(400).json({success:false,message:'Invalid Quantity'})
        }

        const cart = await Cart.findOne({userId : req.session.user})
        if(!cart) return res.status(404).json({success:false,message:'Cart not found'})

        const item = cart.items.id(req.params.itemId)
        if(!item) return res.status(404).json({success:false,message:'Item not in cart.'})

            // revalidate stock live

            const {ok,message,variant} = await validateVariant(item.productId,item.variantId,item.size,newQty)
            if(!ok) return res.status(400).json({success:false,message})

            if(newQty > MAX_PER_ITEM){
                return res.status(400).json({success:false,message:`Maximum ${MAX_PER_ITEM} units per item.`})
            }
            if(newQty > variant.stock){
                return res.status(400).json({success:false,message:`Only ${variant.stock} unit(s) available.`})
            }

            item.quantity = newQty;
            item.totalPrice = item.price * newQty;
            await cart.save()

            const subtotal = cart.items.reduce((s,i)=> s + i.price * i.quantity, 0)
            return res.json({success:true,quantity:newQty,totalPrice:item.totalPrice,subtotal})
    } catch (error) {
        console.log('editCartitem Error : ',error)
        return res.status(500).json({success:false,message:'Server Error.'})
    }
}

const removeCartItem = async(req,res)=>{
    try {
        if(!req.session || !req.session.user){
            return res.status(401).json({success:false, message:'Please login to continue.'})
        }
        const cart = await Cart.findOne({userId : req.session.user})
        if(!cart) return res.status(404).json({success:false,message:'Cart not found'})

            const before = cart.items.length
            cart.items = cart.items.filter((i)=> i._id.toString() !== req.params.itemId)

            if(cart.items.length === before){
                return res.status(404).json({success:false,message:'Item not found in cart.'})
            }

            await cart.save()

            const subtotal = cart.items.reduce((s,i)=> s + i.price * i.quantity, 0)
            return res.json({success:true,subtotal,cartCount : cart.items.length})
    } catch (error) {
        console.log('removeCartItem Error : ',error)
        return res.status(500).json({success:false,message:'Server error.'})
    }
}


const addFromWishlist = async(req,res)=>{
    try {
        if(!req.session || !req.session.user){
            return res.status(401).json({success:false, message:'Please login to continue.'})
        }
        const {productId, variantId, size, wishlistItemId} = req.body;

        if(!productId || !variantId || !size){
            return res.status(400).json({success:false,message:'Please select a variant and size'})
        }

        const product = await Product.findById(productId).lean()
        if(!product || product.isBlocked){
            return res.status(400).json({success:false,message:'Product Unavailable'})
        }

        const variant = product.variants.find((v)=> v._id.toString() === variantId.toString())
        if(!variant || !isVariantAvailable(variant)){
            return res.status(400).json({success:false,message:'Selected variant is unavailable'})
        }

        if(!variant.size?.includes(size)){
            return res.status(400).json({success:false,message:'Selected size is unavailable for this variant'})
        }

        const unitPrice = variant.offerActive ? variant.offerPrice : variant.productPrice

        const cart = await getOrCreateCart(req.session.user)
        const existing = cart.items.find((i)=>
              i.productId.toString() === productId &&
              i.variantId.toString() === variantId &&
              i.size === size
        )

        if(existing){
            const newQty = existing.quantity + 1
            if(newQty > MAX_PER_ITEM || newQty > variant.stock){
                return res.status(400).json({success:false,message:'Maximum quantity reached'})
            }
            existing.quantity = newQty
            existing.totalPrice = unitPrice * newQty;
        }else{
            cart.items.push({
                productId,variantId,size,
                quantity : 1,
                price : unitPrice,
                totalPrice : unitPrice,
                status : 'onStock'
            })
        }

        await cart.save()

        if(wishlistItemId){
            await Wishlist.updateOne(
                {userId : req.session.user},
                {$pull : { products : {_id: wishlistItemId}}}
            )
        }else{
            await Wishlist.updateOne(
                {userId : req.session.user},
                {$pull : { products : {productId}}}
            )
        }
        return res.json({success:true,message:'Moved to cart!',cartCount : cart.items.length})
    } catch (error) {
        console.log('addFromWishlist Error : ',error)
        return res.status(500).json({success:false,message:'Server error.'})
    }
}

export {
    loadCart,
    addToCart,
    editCartItem,
    removeCartItem,
    addFromWishlist
}