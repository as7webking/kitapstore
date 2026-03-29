import React from "react";
import { Link } from "react-router-dom";

const BookCard = ({ data, favourite, handleRemoveBook }) => {
  const fallbackImage = "https://img.freepik.com/free-vector/illustration-gallery-icon_53876-27002.jpg";

  return (
    <div>
      <Link to={`/view-book-details/${data.slug}`}>
        <div className="bg-zinc-400 rounded p-4 flex flex-col">
          <div className="bg-zinc-700 rounded flex items-center justify-center h-[25vh] overflow-hidden">
            <img
              src={data.url || fallbackImage}
              alt={data.title || "Book"}
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
            {data.price} €
          </p>
        </div>
      </Link>

      {favourite && (
        <button className="bg-yellow-100" onClick={handleRemoveBook}>
          Remove from favourite
        </button>
      )}
    </div>
  );
};

export default BookCard;