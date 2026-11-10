import FailureState from '../../errors/FailureState.jsx';
import { useApiResource } from '../../errors/useApiResource.js';
import { t } from '../../i18n/index.js';
import { API_BASE_URL } from "../../config/api.js";
import React from "react";
import BookCard from "../BookCard/BookCard";
const Favourites = () => {
  const { data: FavouriteBooks, loading, error, retry } = useApiResource(`${API_BASE_URL}/api/v1/favourites/get-favourite-books`);
  if (error) return <FailureState kind={error} onRetry={retry} />;
  if (loading) return <p role="status">{t('common:loading')}</p>;
  return (
    <>{FavouriteBooks && FavouriteBooks.length === 0 && (
        <div className="text-5xl font-semibold text-zinc-500 flex items-center justify-center w-full flex-col bg-pink-100">{t("profile:no_favourite_books")}</div>
    )}
    <div className="grid grid-cols-4 gap-4">
      {FavouriteBooks &&
        FavouriteBooks.map((items, i) => (
          <div key={i}>
            <BookCard data={items} favourite={true} />
          </div>
        ))}
    </div>
    </>
  );
};

export default Favourites;
