const mongoose = require("mongoose");

const book = new mongoose.Schema(
    {
        url: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        author: {
            type: String,
            required: true,
        },
        slug: {
            type: String,
            unique: true,
            lowercase: true,
        },
        price: {
            type: Number,
            required: true,
        },
        desc: {
            type: String,
            required: true,
        },
        language: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

book.pre('save', function(next) {
  if (!this.isModified('title')) return next();
  
  this.slug = slugify(this.title, { lower: true, strict: true });
  next();
});

module.exports = mongoose.model("books", book);