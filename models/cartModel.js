import mongoose from 'mongoose';
const { Schema } = mongoose;

const cartSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    items: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        quantity: {
            type: Number,
            default: 1
        },
        variantId: {
            type: Schema.Types.ObjectId,
            required: true
        },
        size: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        totalPrice: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ["onStock", "outOfStock", "archived"],
            default: "onStock",
            required: true
        },

    }]
}, { timestamps: true })

const Cart = mongoose.model('Cart', cartSchema)

export default Cart