import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useLocation } from "react-router-dom";

const SearchResults = () => {
  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search).get("q")?.trim() || "", [location.search]);

  const [books, setBooks] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!query) {
        setBooks([]);
        setBlogs([]);
        return;
      }

      setLoading(true);
      try {
        const [booksRes, blogsRes] = await Promise.all([
          axios.get("http://localhost:1001/api/v1/get-all-books"),
          axios.get("http://localhost:1001/api/v1/blog/get-all-blogs"),
        ]);

        const q = query.toLowerCase();

        const filteredBooks = (booksRes.data?.data || []).filter((book) =>
          [book.title, book.author, book.desc, book.language].some((value) =>
            String(value || "").toLowerCase().includes(q),
          ),
        );

        const filteredBlogs = (blogsRes.data?.data || []).filter((blog) =>
          [blog.title, blog.excerpt, blog.content, blog.author].some((value) =>
            String(value || "").toLowerCase().includes(q),
          ),
        );

        setBooks(filteredBooks);
        setBlogs(filteredBlogs);
      } catch {
        setBooks([]);
        setBlogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [query]);

  return (
    <div className="bg-white text-gray-700 min-h-screen w-[90%] max-w-[1200px] mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold">Search</h1>
      <p className="text-gray-500 mt-2">
        Query: <span className="font-semibold">{query || "—"}</span>
      </p>

      {loading ? (
        <p className="mt-6">Loading...</p>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-2xl font-semibold">Books ({books.length})</h2>
            {books.length === 0 ? (
              <p className="text-gray-500 mt-2">No books found.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                {books.map((book) => (
                  <Link key={book._id} to={`/view-book-details/${book.slug}`} className="border rounded-xl p-4 hover:shadow-md">
                    <div className="flex gap-3">
                      {book.url && <img src={book.url} alt={book.title} className="h-20 w-16 object-cover rounded" />}
                      <div>
                        <h3 className="font-semibold">{book.title}</h3>
                        <p className="text-sm text-gray-500">{book.author}</p>
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">{book.desc}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold">Blog posts ({blogs.length})</h2>
            {blogs.length === 0 ? (
              <p className="text-gray-500 mt-2">No articles found.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                {blogs.map((blog) => (
                  <Link key={blog._id} to={`/blog/${blog.slug}`} className="border rounded-xl p-4 hover:shadow-md">
                    <h3 className="font-semibold">{blog.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mt-2">{blog.excerpt || blog.content}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default SearchResults;