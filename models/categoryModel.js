import mongoose from 'mongoose';
import { boolean } from 'webidl-conversions';
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
    isblocked:{
        type:Boolean,
        required:true,
        default:false
    },
    categoryOffer:{
        type:Number,
        default:0,

    }
    

},{timestamps:true})

const category = mongoose.model('category',categorySchema)

export default {category}