import Cart from '../models/cartModel.js'

const attachCartCount = async(req,res,next)=>{
    try {
        if(req.session.user){
            const cart = await Cart.findOne({userId : req.session.user}).lean()
            res.locals.cartCount = cart ? cart.items.length : 0
        }else{
            res.locals.cartCount = 0;
        }
    } catch (error) {
        res.locals.cartCount = 0
    }
    next()
}

export default attachCartCount