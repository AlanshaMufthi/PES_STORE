import mongoose from 'mongoose';
const {Schema} = mongoose;

const categorySchema = new Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    description:{
        type:String,
        required:true
    },
    isBlocked:{
        type:Boolean,
        required:true,
        default:false
    },
    categoryOffer:{
        type:Number,
        default:0,
    },
    offerActive:{
        type:Boolean,
        default:false
    }
    

},{timestamps:true})

const Category = mongoose.model('Category',categorySchema)

export default Category