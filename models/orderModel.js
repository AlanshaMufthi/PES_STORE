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
    totalPrice: {type: Number, required: true},
    status: {
        type: String,
        enum: ['placed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'cancel_requested', 'return_requested', 'returned'],
        default: 'placed'
    },
    returnStatus: {
        type: String,
        enum: ['none', 'Requested', 'Accepted', 'Rejected'],
        default: 'none'
    },
    returnReason: {
        type: String,
        default: ''
    }
})

const orderSchema = new Schema({
    orderId: {
        type: String,
        unique: true
    },
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
        enum: ['placed','processing','shipped','out_for_delivery','delivered','cancelled', 'cancel_requested', 'return_requested', 'returned'],
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
    cancellationReason: {
        type: String,
        default: ''
    },
    cancelledAt: {
        type: Date
    },
    returnReason: {
        type: String,
        default: ''
    },
    returnRequestedAt: {
        type: Date
    }
},{timestamps: true})

orderSchema.pre('save', async function() {
    if (this.orderId) return

    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '')
    let attempt = 0

    while (attempt < 10) {
        const randomPart = Math.floor(1000 + Math.random() * 9000)
        const candidate = `ORD${datePart}${randomPart}`
        const exists = await mongoose.models.Order.exists({ orderId: candidate })

        if (!exists) {
            this.orderId = candidate
            return
        }
        attempt += 1
    }

    this.orderId = `ORD${datePart}${Date.now().toString().slice(-6)}`
});

const Order = mongoose.model('Order', orderSchema)

export default Order;