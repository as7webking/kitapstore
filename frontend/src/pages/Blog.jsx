import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const Blog = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await axios.get("http://localhost:1001/api/v1/blog/get-all-blogs");
        setBlogs(res.data.data || []);
      } catch {
        setBlogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  return (
    <div className="bg-white text-gray-700 min-h-screen w-[90%] max-w-[1200px] mx-auto px-6 py-8">
      <h1 className="text-4xl font-bold mb-6">Blog</h1>

      {loading ? (
        <p>Loading...</p>
      ) : blogs.length === 0 ? (
        <p>No blog posts yet.</p>
      ) : (
        <div className="grid gap-6">
          {blogs.map((blog) => (
            <article key={blog._id} className="border rounded-xl p-5 shadow-sm">
              <h2 className="text-2xl font-semibold">{blog.title}</h2>
              <p className="text-sm text-gray-500 mt-2">
                {new Date(blog.createdAt).toLocaleDateString()}
              </p>

              <p className="mt-3 text-gray-700 line-clamp-3">{blog.excerpt || blog.content}</p>

              <Link
                to={`/blog/${blog.slug}`}
                className="inline-block mt-4 text-blue-600 hover:text-blue-800 font-medium"
              >
                Read more →
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Blog;