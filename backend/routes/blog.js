const router = require("express").Router();
const User = require("../models/user");
const Post = require("../models/post");
const { authentificateToken } = require("./userAuth");
const slugify = require("slugify");

router.post("/add-blog", authentificateToken, async (req, res) => {
  try {
    const { id } = req.headers;
    const user = await User.findById(id);

    if (!user || user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "You are not having access to perform admin work" });
    }

    const { title, slug, content, coverImage, author, excerpt, status } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    const finalSlug = slugify(slug || title, { lower: true, strict: true, trim: true });

    const existing = await Post.findOne({ slug: finalSlug });
    if (existing) {
      return res.status(400).json({ message: "Blog with this slug already exists" });
    }

    const blog = new Post({
      coverImage,
      title,
      slug: finalSlug,
      author: author || user.name || "Admin",
      excerpt,
      content,
      status: status || "published",
    });

    await blog.save();

    return res.status(201).json({ message: "Blog added successfully", data: blog });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/get-all-blogs", async (_req, res) => {
  try {
    const blogs = await Post.find({ status: "published" }).sort({ createdAt: -1 });

    return res.json({
      status: "Success",
      data: blogs,
    });
  } catch (error) {
    return res.status(500).json({ message: "An error occured" });
  }
});

router.get("/get-blog-by-slug/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const blog = await Post.findOne({ slug, status: "published" });
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    const similarBlogs = await Post.find({
      _id: { $ne: blog._id },
      status: "published",
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .select("title slug excerpt createdAt");

    return res.json({
      status: "Success",
      data: blog,
      similar: similarBlogs,
    });
  } catch (error) {
    return res.status(500).json({ message: "An error occured" });
  }
});

module.exports = router;
