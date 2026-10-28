import React, { useEffect, useState } from "react";
import axios from "axios";
import BookCard from "../BookCard/BookCard";

const SearchBooks = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      try {
        const res = await axios.get(
          `http://localhost:5173/api/books/search?q=${query}`
        );
        setResults(res.data);
      } catch (error) {
        console.error("Search error:", error);
      }
    }, 400);

    return () => clearTimeout(delay);
  }, [query]);

  return (
    <div className="w-full">
      <input
        type="text"
        placeholder="Search books..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full p-3 rounded border outline-none"
      />

      {query && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.length > 0 ? (
            results.map((book) => <BookCard key={book._id} data={book} />)
          ) : (
            <p>No books found</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBooks;