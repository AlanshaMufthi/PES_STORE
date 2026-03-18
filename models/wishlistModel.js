import mongoose from 'mongoose'
const {Schema} = mongoose

const wishlistSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:'user',
        required:true
    },
    products:[{
        productsId:{
            type:Schema.Types.ObjectId,
            ref:'products',
            required:true
        },
        addedOn:{
            type:Date,
            default:Date.now
        }

    }]
})

const wishlist = mongoose.model('whishlist',wishlistSchema)


export default {wishlist}