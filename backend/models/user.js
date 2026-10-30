const mongoose = require("mongoose");

const user = new mongoose.Schema(
    {
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    googleId: { type: String, unique: true, sparse: true },
    password: {
        type: String,
        required: function () { return this.authProvider === "local"; },
    },
    address: {
        type: String,
        required: function () { return this.authProvider === "local"; },
    },
    avatar: {
        type: String,
        default: "",
    },
    role: {
        type: String,
        default: "user",
        enum: ["user", "admin"],
    },
    favourites: [
        {
            type: mongoose.Types.ObjectId,
            ref: "Book",
        },
    ],
    cart: [
        {
            type: mongoose.Types.ObjectId,
            ref: "Book",
        },
    ],
    orders: [
        {
            type: mongoose.Types.ObjectId,
            ref: "order",
        },
    ],

    // If google / FB
    authProvider: {
      type: String,
      enum: ["local", "google", "facebook"],
      default: "local",
    },
},
    { timestamps: true }
);

module.exports = mongoose.model("user", user);