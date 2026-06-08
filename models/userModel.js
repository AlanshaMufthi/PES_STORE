 import mongoose from 'mongoose';
const { Schema } = mongoose;
 
 const userSchema = new Schema({
    firstName:{
        type:String,
        required:true,
        trim:true
    },
    lastName:{
        type:String,
        required:false,
        trim:true
    },
    phone:{
        type:String,
        required:false,
        unique:true,
        sparse:true,
        default:null
    },
    email:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        lowercase:true
    },
    googleId:{
        type:String,
        unique:true,
        sparse:true
    },
    password:{
        type:String,
        required:false
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Boolean,
        default:false
    },
    profileImg:{
        type:String,
        default:'img/Solidão____.jpg'
        
    },
    // cart:[{
    //     type:Schema.Types.ObjectId,
    //     ref:"Cart"
    // }],
    wallet:{
        type:Number,
        default:0
    },
    // wishlist:[{
    //     type:Schema.Types.ObjectId,
    //     ref:"wishlist"
    // }],
    // orderHistory:[{
    //     type:Schema.Types.ObjectId,
    //     ref:"order"
    // }],
    // createOn:{
    //     type:Date,
    //     default:Date.now
    // },
    // refferalcode:{
    //     type:String,
       
    // },
    // redeemed:{
    //     type:Boolean,
    // },
    // redeemedUsers:[{
    //     type:Schema.Types.ObjectId,
    //     ref:"user"
    // }],
    // searchHistory:[{
    //     category:{
    //         type:Schema.Types.ObjectId,
    //         ref:"catergory"
    //     },
    //     brand:{
    //         type:String
    //     },
    //     searchOn:{
    //         type:Date,
    //         default:Date.now
    //     }
    // }]


 },{timestamps:true})


const User = mongoose.model('User',userSchema)

 export default User