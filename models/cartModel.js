import mongoose from 'mongoose';
const {Schema} =  mongoose;

const cartSchema  = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"user",
        required:true
    },
    items:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:"product",
            required:true
        },
        quantitiy:{
            type:Number,
            default:1
        },
        price:{
            type:Number,
            required:true
        },
        totalprice:{
            type:Number,
            required:true
        },
        status:{
            type:String,
            enum:["onastock","outOfStock","archived"],
            default:"onstock",
            required:true
        },
        
    }]
})

const cart = mongoose.model('cart',cartSchema)

export default {cart}