const mongoose = require("mongoose");
const slugify = require("slugify");

const postSchema = new mongoose.Schema(
  {
    coverImage: {
      type: String,
      default: "",
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },

    excerpt: {
      type: String,
      default: "",
      trim: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    author: {
      type: String,
      default: "Admin",
      trim: true,
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
  },
  { timestamps: true },
);

//
// 🔐 BUSINESS VALIDATION
//
postSchema.pre("validate", function () {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title, { lower: true, strict: true, trim: true });
  }

  if (!this.excerpt && this.content) {
    this.excerpt = this.content.slice(0, 180);
  }

});

//
// 🔗 SLUG GENERATION
//
postSchema.pre("save", function () {
  if (!this.isModified("title") || this.slug) return;

  this.slug = slugify(this.title, { lower: true, strict: true, trim: true });
});

module.exports = mongoose.model("Post", postSchema);
