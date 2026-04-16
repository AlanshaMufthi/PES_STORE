import mongoose from 'mongoose'
const {Schema} = mongoose

const wishlistSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true,
        unique:true
    },
    products:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:'Product',
            required:true
        },
        addedAt:{
            type:Date,
            default:Date.now
        }

    }]
},{timestamps:true})

const Wishlist = mongoose.model('Wishlist',wishlistSchema)


export default Wishlist