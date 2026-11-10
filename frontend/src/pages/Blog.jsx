import FailureState from '../errors/FailureState.jsx';
import { useApiResource } from '../errors/useApiResource.js';
import { t, formatDate } from '../i18n/index.js';
import { API_BASE_URL } from "../config/api.js";
import React from "react";
import { Link } from "react-router-dom";

const Blog = () => {
  const { data, loading, error, retry } = useApiResource(`${API_BASE_URL}/api/v1/blog/get-all-blogs`);
  const blogs = data || [];
  if (error) return <FailureState kind={error} onRetry={retry} />;

  return (
    <div className="bg-white text-gray-700 min-h-screen w-[90%] max-w-[1200px] mx-auto px-6 py-8">
      <h1 className="text-4xl font-bold mb-6">{t("blog:blog")}</h1>

      {loading ? (
        <p>{t("blog:loading")}</p>
      ) : blogs.length === 0 ? (
        <p>{t("blog:no_blog_posts_yet")}</p>
      ) : (
        <div className="grid gap-6">
          {blogs.map((blog) => (
            <article key={blog._id} className="border rounded-xl p-5 shadow-sm">
              <h2 className="text-2xl font-semibold">{blog.title}</h2>
              <p className="text-sm text-gray-500 mt-2">
                {formatDate(blog.createdAt)}
              </p>

              <p className="mt-3 text-gray-700 line-clamp-3">{blog.excerpt || blog.content}</p>

              <Link
                to={`/blog/${blog.slug}`}
                className="inline-block mt-4 text-blue-600 hover:text-blue-800 font-medium"
              >{t("blog:read_more")}</Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Blog;