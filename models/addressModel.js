import mongoose from 'mongoose'
const { Schema } = mongoose

const addressSchema = new Schema({
    userId:{
        type:Schema.Type.userId,
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
        firstname:{
            type:String,
            required:true
        },
        lastname:{
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
        }


    }]
})

const address = mongoose.model("address",addressSchema)


export default {address}