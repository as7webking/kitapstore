import FailureState from '../errors/FailureState.jsx';
import { useApiResource } from '../errors/useApiResource.js';
import { t } from '../i18n/index.js';
import { API_BASE_URL } from "../config/api.js";
import React from "react";
import Loader from "../components/Loader/Loader";
import BookCard from "../components/BookCard/BookCard";
import SearchBooks from "../components/SearchBooks/SearchBooks";
import { Link } from "react-router-dom";

const AllBooks = () => {
  const { data: Data, loading, error, retry } = useApiResource(`${API_BASE_URL}/api/v1/get-all-books`);
  if (error) return <FailureState kind={error} onRetry={retry} />;

  return (
    <div className="h-auto  w-[90%] max-w-[1200px] mx-auto px-6 py-8">
      <h4 className="text-3xl text-gray-400">{t("catalog:all_books")}</h4>
      {loading && (
        <div className="w-full h-screen flex items-center justify-center"><Loader /></div>
      )}
      <div className="mt-6"><SearchBooks /></div>
      <div className="my-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {Data &&
          Data.map((item, i) => (
            <div key={i}>
              <BookCard data={item} />
            </div>
          ))}
      </div>

      {/* If no books */}
      {Data && Data.length === 0 && (
        <div className="text-zinc-400 text-center w-full py-10">{t("catalog:no_books_now")}</div>
      )}
    </div>
  );
};

export default AllBooks;
