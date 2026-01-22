import React from "react";
import axios from "axios";
import { Link, useParams } from "react-router-dom";

const BookCard = ({ data, favourite }) => {

  return (
    <div>
      <Link to={`/view-book-details/${data.slug}`}>
        <div className="bg-zinc-400 rounded p-4 flex flex-col">
          <div className="bg-zinc-700 rounded flex ms-center justify-center">
            <img src={data.url} alt="/" className="h-[25vh]" />
          </div>
          <h2 className="mt-4 text-xl text-zinc-100 font-semibold">
            {data.title}
          </h2>
          <p className="mt-2 text-zinc-100 font-semibold">{data.authortitle}</p>
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
