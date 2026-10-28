const mongoose = require("mongoose");
const slugify = require("slugify");

const bookSchema = new mongoose.Schema(
  {
    // Image URL or base64
    url: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    author: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    desc: {
      type: String,
      required: true,
    },

    language: {
      type: String,
      required: true,
    },

    // 🔥 Book type
    type: {
      type: String,
      enum: ["physical", "digital"],
      required: true,
    },

    // 🔥 Digital only
    pdf: {
      type: String, // base64 or file URL
    },

    // 🔥 Physical only
    shippingPrice: {
      type: Number,
      min: 0,
    },

    views: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

//
// 🔐 BUSINESS VALIDATION
//
bookSchema.pre("validate", function (next) {
  if (this.type === "digital" && !this.pdf) {
    return next(new Error("Digital book must have a PDF file"));
  }

  if (this.type === "physical" && this.shippingPrice == null) {
    return next(new Error("Physical book must have shipping price"));
  }

  next();
});

//
// 🔗 SLUG GENERATION
//
bookSchema.pre("save", function (next) {
  if (!this.isModified("title")) return next();

  this.slug = slugify(this.title, { lower: true, strict: true });
  next();
});

module.exports = mongoose.model("Book", bookSchema);
