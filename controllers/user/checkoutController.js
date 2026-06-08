import Cart from '../../models/cartModel.js'
import Order from '../../models/orderModel.js'
import Address from '../../models/addressModel.js'
import Product from '../../models/productModel.js'
import getUserId from '../../helpers/getUserId.js'


const loadCheckout = async(req,res)=>{
    try {
        const userId = getUserId(req)
        const cart = await Cart.findOne({userId}).populate('items.productId')

        if(!cart || cart.items.length === 0){
            return res.redirect('/cart')
        }

        const validItems = cart.items.filter(item=> (item.status || '').toLowerCase() === 'onstock')
        if(validItems.length === 0){
            return res.redirect('/cart')
        }

        const cartItems = validItems.map(item=>({
           productId: item.productId._id,
            variantId: item.variantId,
            productName: item.productId.productname,
            name: item.productId.productname,
            image: item.productId.productImage?.[0] || '',
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.totalPrice
        }))

        const itemsTotal = cartItems.reduce((sum, i)=> sum + i.totalPrice,0)
        const taxAmount = 0
        const discountAmount = 0
        const shippingCharge = 0
        const grandTotal = itemsTotal + taxAmount - discountAmount + shippingCharge

        const addressDocument = await Address.findOne({userId})
        const addresses = addressDocument ? addressDocument.address : []

        return res.render('checkout',{
             cartItems, addresses,
            itemsTotal, shippingCharge, grandTotal,
            subtotal: itemsTotal,
            total: grandTotal,
            discount: discountAmount,
            discountPercent: 0,
            taxAmount
        })

    } catch (error) {
         console.log('loadCheckout Error : ', error)
        return res.redirect('/cart') 
    }
}


const placeOrder = async(req,res)=>{
    const userId = getUserId(req)
    const decremented = []

    try {
        const { addressId, paymentMethod = 'COD'} = req.body;

        const addressDocument = await Address.findOne({ userId })
        if(!addressDocument){
            return res.status(400).json({ success: false, message: 'Please Select a valid delivery address'})
        }

        const selectedAddress = addressDocument.address.id(addressId)
        if(!selectedAddress){
            return res.status(400).json({ success: false, message: 'Please Select a valid delivery address'})
        }

        const cart = await Cart.findOne({userId}).populate('items.productId')
        if(!cart || cart.items.length === 0){
            return res.status(400).json({ success: false, message: 'Your cart is empty'})
        }

        const validItems = cart.items.filter(item => (item.status || '').toLowerCase() === 'onstock')
        if(validItems.length === 0){
            return res.status(400).json({ success: false, message: 'No items in stock are available for checkout'})
        }

 
        for (const item of validItems) {
            const result = await Product.findOneAndUpdate(
                {
                    _id: item.productId._id,
                    'variants._id': item.variantId,
                    'variants.stock': { $gte: item.quantity }  
                },
                {
                    $inc: { 'variants.$.stock': -item.quantity }
                },
                { new: true }
            )

            if (!result) {
                // Either product gone or stock insufficient — roll back what we already decremented
                for (const d of decremented) {
                    await Product.findOneAndUpdate(
                        { _id: d.productId, 'variants._id': d.variantId },
                        { $inc: { 'variants.$.stock': d.quantity } }
                    )
                }
                const product = await Product.findById(item.productId._id).lean()
                const variant = product?.variants?.find(v => v._id.toString() === item.variantId.toString())
                const available = variant?.stock ?? 0
                const name = product?.productname || 'A product'
                return res.status(400).json({
                    success: false,
                    message: available === 0
                        ? `"${name}" is out of stock.`
                        : `Only ${available} unit(s) left for "${name}". Please update your cart.`
                })
            }

            decremented.push({ productId: item.productId._id, variantId: item.variantId, quantity: item.quantity })

            const updatedVariant = result.variants.find(v => v._id.toString() === item.variantId.toString())
            if (updatedVariant && updatedVariant.stock === 0) {
                await Product.updateOne(
                    { _id: result._id, 'variants._id': item.variantId },
                    { $set: { 'variants.$.status': 'outOfStock' } }
                )
            }
        }

        
        const orderItems = validItems.map(item=>({
            productId: item.productId._id,
            variantId: item.variantId,
            name: item.productId.productname,
            image: item.productId.productImage?.[0] || '',
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.totalPrice,
            status: 'placed'
        }))

        const itemsTotal = orderItems.reduce((sum, i )=> sum + i.totalPrice, 0)
        const shippingCharge = 0;
        const grandTotal = itemsTotal + shippingCharge

      
        const newOrder = await Order.create({
            userId, 
            items: orderItems,
            deliveryAddress: {
                name: (selectedAddress.firstName + ' ' + selectedAddress.lastName).trim(),
                place: [selectedAddress.addressLine, selectedAddress.town, selectedAddress.state].filter(Boolean).join(', '),
                pincode: selectedAddress.pincode || '',
                contact: selectedAddress.phone || ''
            },
            paymentMethod: paymentMethod.toLowerCase(),
            paymentStatus: 'pending',
            orderStatus: 'placed',
            subtotal: itemsTotal,
            deliveryCharge: shippingCharge,
            total: grandTotal
        })

    
        await Cart.findOneAndUpdate(
            { userId }, 
            { $pull: { items: { status: { $regex: /^onstock$/i } } } }
        )

        return res.json({ success: true, url: `/orders/success/${newOrder._id}` });
    } catch (error) {
        console.log('placeOrder Error : ', error)
       
        for (const d of decremented) {
            await Product.findOneAndUpdate(
                { _id: d.productId, 'variants._id': d.variantId },
                { $inc: { 'variants.$.stock': d.quantity } }
            ).catch(() => {})
        }
        return res.status(500).json({success: false, message:'Order placement failed. Please try again.'})
    }
}



const loadOrderSuccess = async(req,res)=>{
    try {
        const userId = getUserId(req)
        const order = await Order.findById(req.params.orderId).lean()

        if(!order || order.userId.toString() !== userId.toString()){
            return res.redirect('/orders')
        }

        return res.render('orderPlaced', {order})
    } catch (error) {
        console.log('loadOrderSuccess Error : ', error)
        return res.redirect('/orders')
    }
}


export {

    loadCheckout,
    placeOrder,
    loadOrderSuccess
}