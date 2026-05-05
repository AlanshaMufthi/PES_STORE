import Cart from '../../models/cartModel.js'
import Order from '../../models/orderModel.js'
import Address from '../../models/addressModel.js'
import getUserId from '../../helpers/getUserId.js'


const loadCheckout = async(req,res)=>{
    try {
        const userId = getUserId(req)
        const cart = await Cart.findOne({userId}).populate('items.productId')

        if(!cart || cart.items.length === 0){
            return res.redirect('/cart')
        }

        const validItems = cart.items.filter(item=> item.status === 'onStock')
        if(validItems.length === 0){
            return res.redirect('/cart')
        }

        const cartItems = validItems.map(item=>({
           productId: item.productId._id,
            variantId: item.variantId,
            productName: item.productId.productname, 
            image: item.productId.productImage?.[0] || '',
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.totalPrice
        }))

        const itemsTotal = cartItems.reduce((sum, i)=> sum + i.totalPrice,0)
        const shippingCharge = 0
        const grandTotal = itemsTotal + shippingCharge

        const addressDocument = await Address.findOne({userId})
        const addresses = addressDocument ? addressDocument.address : []

        return res.render('checkout',{
             cartItems, addresses,
            itemsTotal, shippingCharge, grandTotal
        })

    } catch (error) {
         console.log('loadCheckout Error : ', error)
        return res.redirect('/cart') 
    }
}


const placeOrder = async(req,res)=>{
    try {
        const userId = getUserId(req)
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
            return res.redirect('/cart')
        }

        const validItems = cart.items.filter(item=> item.status === 'onStock')
        if(validItems.length === 0){
            return res.redirect('/cart')
        }

        const orderItems = validItems.map(item=>({
            productId: item.productId._id,
            variantId: item.variantId,
            name: item.productId.productname,
            image: item.productId.productImage?.[0] || '',
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.totalPrice
        }))

        const itemsTotal = orderItems.reduce((sum, i )=> sum + i.totalPrice, 0)
        const shippingCharge = 0;
        const grandTotal = itemsTotal + shippingCharge

        const orderId = 'ORD' + Date.now().toString().slice(-8)

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

        await Cart.findOneAndUpdate({userId}, {$pull: {items: {status: 'onStock'}}})

        return res.json({ success: true, url: `/orders/success/${newOrder._id}` });
    } catch (error) {
        console.log('placeOrder Error : ', error)
        return res.status(500).json({success: false, message:'Could not place order. Please try again.'})
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