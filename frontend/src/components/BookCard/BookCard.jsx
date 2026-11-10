import { t, formatNumber } from '../../i18n/index.js';
import React from "react";
import { Link } from "react-router-dom";

const BookCard = ({ data, favourite, handleRemoveBook }) => {
  const fallbackImage = "https://img.freepik.com/free-vector/illustration-gallery-icon_53876-27002.jpg";

  return (
    <div className="min-w-0">
      <Link to={`/view-book-details/${data.slug}`}>
        <div className="min-w-0 bg-zinc-400 rounded p-4 flex flex-col">
          <div className="bg-zinc-700 rounded flex items-center justify-center h-[25vh] overflow-hidden">
            <img
              src={data.url || fallbackImage}
              alt={data.title || t("catalog:book")}
              className="h-full w-full object-contain"
              onError={(e) => {
                e.currentTarget.src = fallbackImage;
              }}
            />
          </div>

          <h2 className="mt-4 text-xl text-zinc-100 font-semibold">
            {data.title}
          </h2>
          <p className="mt-2 text-zinc-100 font-semibold">
            {data.authortitle}
          </p>
          <p className="mt-2 text-xl text-zinc-50 font-semibold">
            {formatNumber(data.price)} €
          </p>
        </div>
      </Link>

      {favourite && (
        <button className="min-h-11 w-full rounded bg-yellow-100 px-3 py-2" onClick={handleRemoveBook}>{t("catalog:remove_from_favourite")}</button>
      )}
    </div>
  );
};

export default BookCard;