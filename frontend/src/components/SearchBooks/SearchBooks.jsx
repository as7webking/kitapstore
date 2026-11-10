import { t } from '../../i18n/index.js';
import { API_BASE_URL } from "../../config/api.js";
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
          `${API_BASE_URL}/api/v1/books/search?q=${encodeURIComponent(query)}`
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
        type="search"
        aria-label={t("catalog:search_books")}
        placeholder={t("catalog:search_books")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="min-w-0 w-full p-3 rounded border focus-visible:ring-2 focus-visible:ring-blue-400"
      />

      {query && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {results.length > 0 ? (
            results.map((book) => <BookCard key={book._id} data={book} />)
          ) : (
            <p>{t("catalog:no_books_found")}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBooks;