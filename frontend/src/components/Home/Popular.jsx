import FailureState from '../../errors/FailureState.jsx';
import { useApiResource } from '../../errors/useApiResource.js';
import { t } from '../../i18n/index.js';
import { API_BASE_URL } from "../../config/api.js";
import React from "react";
import BookCard from "../BookCard/BookCard";
import Loader from "../Loader/Loader";
import { Link } from "react-router-dom";

const Popular = () => {
  const { data: books, loading, error, retry } = useApiResource(`${API_BASE_URL}/api/v1/get-popular-books`);
  if (error) return <FailureState kind={error} onRetry={retry} />;

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto max-w-[1200px] px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10">
          <h2 className="text-3xl md:text-4xl font-semibold">{t("home:popular_books")}</h2>
          <Link
            to="/all-books"
            className="mt-4 md:mt-0 text-gray-600 hover:text-black transition"
          >{t("home:view_all")}</Link>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        )}

        {books && books.length === 0 && (
          <p className="text-center text-gray-500">{t("home:no_popular_books_available")}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
