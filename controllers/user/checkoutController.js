import Cart from '../../models/cartModel.js'
import Order from '../../models/orderModel.js'
import Address from '../../models/addressModel.js'
import getUserId from '../../helpers/getUserId.js'



const getCheckout = async(req,res)=>{
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
            name: item.productId.name,
            image: item.productId.images?.[0] || '',
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.totalPrice
        }))

        const subtotal = cartItems.reduce((sum,i)=> sum + i.totalPrice,0);
        const deliveryCharge = 0;
        const total = subtotal + deliveryCharge

        const addresses = await Address.find({userId});

        return res.render('checkout',{
            cartItems, addresses, subtotal, deliveryCharge, total
        })
    } catch (error) {
        console.log('getacheckout Error : ',error)
        return res.status(500).render('error',{message: 'Something Went Wrong. Please try again.'})
    }
}


const placeOrder = async(req,res)=>{
    try {
        const userId = getUserId(req)
        const { addressId, paymentMethod = 'cod'} = req.body;

        const selectedAddress = await Address.findOne({_id: addressId, userId})

        if(!selectedAddress){
            return res.status(400).json({success: false, message:' Please select a valid delivery address'})
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
            name: item.productId.name,
            image: item.productId.images?.[0] || '',
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.totalPrice
        }))

        const subtotal = orderItems.reduce((sum , i)=> sum + i.totalPrice, 0)
        const deliveryCharge = 0
        const total = subtotal + delivaryCharge;

        const newOrder = await Order.create({
            userId,
            items: orderItems,
            deliveryAddress: {
                name: selectedAddress.name,
                place: selectedAddress.place,
                pincode: selectedAddress.pincode,
                contact: selectedAddress.contact

            },
            paymentMethod,
            paymentStatus: 'pending',
            orderStatus: 'placed',
            subtotal,
            deliveryCharge,
            total
        })


        await Cart.findOneAndUpdate({userId},{$pull: {items: { status: 'onStock'}}})
        return res.redirect(`orders/success/${newOrder._id}`)
    } catch (error) {
        console.log('palceOrder Error : ',error)
        return res.status(500).render('error', {message: 'Could not place order. Please try again.'})
        
    }
}


const getOrderSuccess = async(req,res)=>{
    try {
        const userId = getUserId(req)
        const order = await Order.findById(req.params.orderId)
        if(!order || order.userId.toString() !== userId.toString()){
            return res.status(404).render('error', { message: 'Order not found.'})
        }

        return res.render('orderSuccess', { order });
          
      
    } catch (error) {
          return res.render('getOrderSuccess Error : ', error)
        return res.status(500).render('error', { message: 'Something went Wrong'})
    }
}


export {
    getCheckout,
    placeOrder,
    getOrderSuccess
}