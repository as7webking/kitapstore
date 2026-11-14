const { requireAdmin } = require("../utils/jwt");
console.log("📚 bookRoutes file loaded");

const express = require("express");
const router = require("express").Router();
const User = require("../models/user");
const Book = require("../models/book");
const { authentificateToken } = require("./userAuth");

const { catalogOptions, catalogPage } = require('../services/catalog');

function catalogFailure(res, error) {
  const invalid = error.status === 400 && error.code === 'CATALOG_PARAMETERS_INVALID';
  return res.status(invalid ? 400 : 503).json({
    code: invalid ? 'CATALOG_PARAMETERS_INVALID' : 'CATALOG_UNAVAILABLE',
    message: invalid ? 'Invalid catalog parameters.' : 'Could not load catalog. Please try again.',
  });
}

//add book --admin
router.post("/add-book", authentificateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.headers;
    const user = await User.findById(id);
    if (user.role !== "admin") {
      return res
        .status(400)
        .json({ message: "You are not having access to perform admin work" });
    }
    const book = new Book({
      url: req.body.url,
      title: req.body.title,
      author: req.body.author,
      price: req.body.price,
      desc: req.body.desc,
      language: req.body.language,
      type: req.body.type,
      pdf: req.body.pdf,
      shippingPrice: req.body.shippingPrice,
    });
    await book.save();
    res.status(200).json({ message: "Book added successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

//update book
router.put("/update-book", authentificateToken, requireAdmin, async (req, res) => {
  try {
    const { bookid } = req.headers;
    await Book.findByIdAndUpdate(bookid, {
      url: req.body.url,
      title: req.body.title,
      author: req.body.author,
      price: req.body.price,
      desc: req.body.desc,
      language: req.body.language,
      type: req.body.type,
      pdf: req.body.pdf,
      shippingPrice: req.body.shippingPrice,
    });

    return res.status(200).json({
      message: "Book Updated successfully!",
    });
  } catch (error) {
    res.status(500).json({ message: "An error occured" });
  }
});

//delete book
router.delete("/delete-book", authentificateToken, requireAdmin, async (req, res) => {
  try {
    const { bookid } = req.headers;
    await Book.findByIdAndUpdate(bookid, { isDeleted: true });
    return res.status(200).json({
      message: "Book deleted successfully!",
    });
  } catch (error) {
    res.status(500).json({ message: "An error occured" });
  }
});

// Additive paginated endpoint. Legacy list/search keep their existing shapes.
router.get('/catalog', async (req, res) => {
  try { return res.json({ status: 'Success', ...await catalogPage(Book, req.query) }); }
  catch (error) { return catalogFailure(res, error); }
});

//get all books
router.get("/get-all-books", async (req, res) => {
  try {
    if (Object.keys(req.query).length) return res.json({ status: 'Success', ...await catalogPage(Book, req.query) });
    const books = await Book.find({ isDeleted: { $ne: true } }).select("-pdf").sort({ createdAt: -1, _id: -1 });
    return res.json({
      status: "Success",
      data: books,
    });
  } catch (error) {
    return catalogFailure(res, error);
  }
});

//get recently added books - limit 7
router.get("/get-recent-books/", async (req, res) => {
  try {
    const books = await Book.find({ isDeleted: { $ne: true } }).select("-pdf").sort({ createdAt: -1 }).limit(4);
    return res.json({
      status: "Success",
      data: books,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "An error occured" });
  }
});

// get popular books
router.get("/get-popular-books", async (req, res) => {
  try {
    const books = await Book.find({ isDeleted: { $ne: true } }).select("-pdf").sort({ views: -1, createdAt: -1 }).limit(6);

    res.json({ status: "Success", data: books });
  } catch (error) {
    res.status(500).json({ message: "An error occured" });
  }
});

//get book by id
router.get("/get-book-by-id/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const books = await Book.findOne({ _id: id, isDeleted: { $ne: true } }).select("-pdf");
    return res.json({
      status: "Success",
      data: books,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "An error occured" });
  }
});

//get book by slug
router.get("/get-book-by-slug/:slug", async (req, res) => {
  try {
    // Searching in database slug, not ID
    const { slug } = req.params;
    const book = await Book.findOne({ slug: slug, isDeleted: { $ne: true } }).select("-pdf");

    if (!book) return res.status(404).send("Book not found");
    return res.json(book);
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// Legacy search still returns an array and caps results at 20 by default.
router.get("/search", async (req, res) => {
  try {
    const options = catalogOptions(req.query);
    if (!(req.query.q || '').trim()) return res.json([]);
    const pageSize = req.query.pageSize === undefined ? 20 : options.pageSize;
    const books = await Book.find(options.filter).select('-pdf').sort(options.sort)
      .skip((options.page - 1) * pageSize).limit(pageSize);
    return res.json(books);
  } catch (error) {
    return catalogFailure(res, error);
  }
});

module.exports = router;
