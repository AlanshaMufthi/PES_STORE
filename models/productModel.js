import mongoose from 'mongoose'
const {Schema}=mongoose

const productSchema = new Schema({
    productname:{
        type:String,
        required:true
    },
    brand:{
        type:String,
        enum:['Nike','Adidas','Puma','New Balance','Mizuno'],
        required:true
    },
    gender:{
        type:String,
        enum:['Male','Female','Unisex','Gender'],
        required:true
    },
    description:{
        type:String,
        required:true
    },
    collection:{
        type:String,
        enum:['Retro','Limited Edition','Signature','Latest'],
        required:true
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:"category",
        required:true
    },
    productImage:{
        type:[String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    variants:[{
        size:{
            type:[String],
            required:true
        },
         status:{
        type:String,
        enum:["onStock","outOfStock","archived"],
        default:'active',
        required:true
        },
        stock:{
            type:Number,
            min:0,
            required:true
        },
        productPrice:{
            type:Number,
            required:true
        },
        productDiscountPrice:{
            type:Number,
            required:true
        }


    }]

    
},{timestamps:true})


const product = mongoose.model('product',productSchema)

export default {product}