import mongoose from 'mongoose'
const { Schema } = mongoose;


const orderItemSchema = new Schema({

    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    variantId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    name: {type: String, required: true},
    image: {type: String, default: ''},
    size: {type: String, required: true},
    quantity: {type: Number, required: true, min: 1},
    price: {type: Number, required: true},
    totalPrice: {type: Number, required: true}
})

const orderSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref:'User',
        required:true
    },

    items: [orderItemSchema],

    deliveryAddress: {
        name: {
            type: String,
            required:true
        },
        place: {
            type: String,
            required: true
        },
        pincode: {
            type: String,
            required: true
        },
        contact: {
            type: String,
            required: true
        }
    },

    paymentMethod: {
        type: String,
        enum: ['cod','card','upi','bank'],
        default: 'cod'
    },

    paymentStatus: {
        type: String,
        enum: ['pending','paid','failed'],
        default: 'pending'
    },

    orderStatus: {
        type: String,
        enum: ['placed','processing','shipped','delivered','cancelled'],
        default: 'placed'
    },

    subtotal : {
        type: Number,
        required: true
    },
    deliveryCharge: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true
    },
},{timestamps: true})

const Order = mongoose.model('Order',orderSchema)

export default Order;