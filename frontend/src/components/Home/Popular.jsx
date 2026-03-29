import React, { useEffect, useState } from "react";
import axios from "axios";
import BookCard from "../BookCard/BookCard";
import Loader from "../Loader/Loader";
import { Link } from "react-router-dom";

const Popular = () => {
  const [books, setBooks] = useState(null);

  useEffect(() => {
    const fetchPopular = async () => {
      try {
        const res = await axios.get(
          "http://localhost:1001/api/v1/get-popular-books"
        );
        setBooks(res.data.data);
      } catch (error) {
        console.error("Error loading popular books:", error);
        setBooks([]);
      }
    };

    fetchPopular();
  }, []);

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto max-w-[1200px] px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10">
          <h2 className="text-3xl md:text-4xl font-semibold">
            Popular Books
          </h2>
          <Link
            to="/all-books"
            className="mt-4 md:mt-0 text-gray-600 hover:text-black transition"
          >
            View all →
          </Link>
        </div>

        {!books && (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        )}

        {books && books.length === 0 && (
          <p className="text-center text-gray-500">
            No popular books available.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {books &&
            books.map((book, index) => (
              <BookCard key={index} data={book} />
            ))}
        </div>
      </div>
    </section>
  );
};

export default Popular;
