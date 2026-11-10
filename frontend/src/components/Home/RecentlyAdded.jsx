import FailureState from '../../errors/FailureState.jsx';
import { useApiResource } from '../../errors/useApiResource.js';
import { t } from '../../i18n/index.js';
import { API_BASE_URL } from "../../config/api.js";
import React from "react";
import BookCard from "../BookCard/BookCard";
import Loader from "../Loader/Loader";
const RecentlyAdded = () => {
  const { data: Data, loading, error, retry } = useApiResource(`${API_BASE_URL}/api/v1/get-recent-books`);
  if (error) return <FailureState kind={error} onRetry={retry} />;

  return (
    <section className="bg-zinc-700">
      <div className="container w-[90%] max-w-[1200px] mx-auto px-6 py-8">
        <div className="mt-8 px-4">
          <h4 className="text-3xl text-gray-400">{t("home:recently_added_books")}</h4>
          {loading && (
            <div className="flex items-center justify-center my-8">
              <Loader />
            </div>
          )}
          {Data?.length === 0 && <p role="status">{t("catalog:no_books_now")}</p>}
          <div className="my-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Data &&
              Data.map((items, i) => (
                <div key={i}>
                  <BookCard data={items} />
                </div>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RecentlyAdded;
