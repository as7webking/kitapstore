const router = require("express").Router();
const User = require("../models/user");
const { authentificateToken } = require("./userAuth");

// add book to favourite
router.put("/add-book-to-favourite", authentificateToken, async (req, res) => {
  try {
    const { bookid, id } = req.headers;
    const userData = await User.findById(id);
    const isBookFavourite = userData.favourites.includes(bookid);
    if (isBookFavourite) {
        return res.status(200).json({ message: "Book is already in favourites" });
    }
    await User.findByIdAndUpdate(id, { $push: { favourites: bookid } });
    return res.status(200).json({ message: "Book added to favourites" });
  } catch (error) {
    res.status(500).json({ message: "An error occured" });
  }
});

// delete book from favourite
router.put("/remove-book-from-favourite", authentificateToken, async (req, res) => {
  try {
    const { bookId, id } = req.headers;
    const userData = await User.findById(id);
    const isBookFavourite = userData.favourites.includes(bookid);
    if (isBookFavourite) {
        await User.findByIdAndUpdate(id, { $pull: { favourites: bookid } });
    }
    
    return res.status(200).json({ message: "Book removed from favourites" });
  } catch (error) {
    res.status(500).json({ message: "An error occured" });
  }
});

// add book to favourite
router.get("/get-favourite-books", authentificateToken, async (req, res) => {
  try {
    const { id } = req.headers;
    const userData = await User.findById(id).populate("favourites");
    const favouriteBooks = userData.favourites;
    return res.json({
        status: "Success",
        data: favouriteBooks,
    });
  } catch (error) {
    res.status(500).json({ message: "An error occured" });
  }
});

module.exports = router;