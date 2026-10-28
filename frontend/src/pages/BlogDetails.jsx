import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";

const BlogDetails = () => {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlog = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `http://localhost:1001/api/v1/blog/get-blog-by-slug/${slug}`,
        );

        setBlog(res.data.data || null);
        setSimilar(res.data.similar || []);
      } catch {
        setBlog(null);
        setSimilar([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [slug]);

  if (loading) {
    return (
      <div className="bg-white text-gray-700 min-h-screen w-[90%] max-w-[1200px] mx-auto px-6 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="bg-white text-gray-700 min-h-screen w-[90%] max-w-[1200px] mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-3">Blog not found</h1>
        <Link to="/blog" className="text-blue-600 hover:text-blue-800">
          ← Back to all posts
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white text-gray-700 min-h-screen w-[90%] max-w-[1200px] mx-auto px-6 py-8">
      <Link to="/blog" className="text-blue-600 hover:text-blue-800">
        ← Back to all posts
      </Link>

      <article className="mt-4">
        <h1 className="text-4xl font-bold leading-tight">{blog.title}</h1>
        <p className="text-sm text-gray-500 mt-3">
          {new Date(blog.createdAt).toLocaleDateString()} • {blog.author}
        </p>

        {blog.coverImage && (
          <img
            src={blog.coverImage}
            alt={blog.title}
            className="w-full max-h-[450px] object-cover rounded-xl mt-6"
          />
        )}

        <div className="mt-6 whitespace-pre-line leading-7 text-lg text-gray-800">{blog.content}</div>
      </article>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">Похожие статьи</h2>

        {similar.length === 0 ? (
          <p className="text-gray-500">Пока нет похожих статей.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {similar.map((item) => (
              <Link
                key={item._id}
                to={`/blog/${item.slug}`}
                className="border rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold text-lg">{item.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(item.createdAt).toLocaleDateString()}
                </p>
                <p className="mt-2 text-gray-700 line-clamp-2">{item.excerpt}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default BlogDetails;
