import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "../components/Loader/Loader";
import BookCard from "../components/BookCard/BookCard";
import SearchBooks from "../components/SearchBooks/SearchBooks";
import { Link } from "react-router-dom";

const AllBooks = () => {
  const [Data, setData] = useState();
  useEffect(() => {
    const fetch = async () => {
      const response = await axios.get(
        "http://localhost:1001/api/v1/get-all-books"
      );
      setData(response.data.data);
    };
    fetch();
  }, []);

  return (
    <div className="h-auto  w-[90%] max-w-[1200px] mx-auto px-6 py-8">
      <h4 className="text-3xl text-gray-400">All books</h4>
      {!Data && (
        <div className="w-full h-screen flex items-center justify-center">
          No matched books
        </div>
      )}
      <div className="my-8 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-8">
        {Data &&
          Data.map((item, i) => (
            <div key={i}>
              <SearchBooks />
              <BookCard data={item} />
            </div>
          ))}
      </div>

      {/* If no books */}
      {Data && Data.length === 0 && (
        <div className="text-zinc-400 text-center w-full py-10">
          No books now.
        </div>
      )}
    </div>
  );
};

export default AllBooks;
