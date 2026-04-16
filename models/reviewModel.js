import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    reviewComment: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000,
    },
    reviewImgs: {
      type: [String],  
      default: [],
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,  
    },
  },
  { timestamps: true } 
);

// One review per user per product
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);
export default Review;