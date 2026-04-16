import mongoose from 'mongoose'
const { Schema } = mongoose

const addressSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"user",
        required:true
    },
    address:[{
        addressType:{
            type:String,
            enum:['Home','Work'],
            default:'Home',
            required:true
        },
        firstName:{
            type:String,
            required:true
        },
        lastName:{
            type:String,
            required:true
        },
        phone:{
            type:String,
            required:true
        },
        addressLine:{
            type:String,
            required:true
        },
        town:{
            type:String,
            required:true
        },
        state:{
            type:String,
            required:true
        },
        landmark:{
            type:String
        },
        pincode:{
            type:String,
            required:true
        },
        isPrimary:{
            type:Boolean,
            default:false
        }


    }]
})

const Address = mongoose.model("address",addressSchema)


export default  Address