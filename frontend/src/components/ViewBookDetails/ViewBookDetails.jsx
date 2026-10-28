import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "../Loader/Loader";
import { Link, useNavigate, useParams } from "react-router-dom";
import { GrLanguage } from "react-icons/gr";
import { FaHeart, FaShoppingCart, FaEdit } from "react-icons/fa";
import { MdOutlineDelete } from "react-icons/md";
import { useSelector } from "react-redux";

const GUEST_FAV_COOKIE = "guest_favourites";

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const setCookie = (name, value, maxAgeSeconds) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
};

const getGuestFavourites = () => {
  try {
    const raw = getCookie(GUEST_FAV_COOKIE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const ViewBookDetails = () => {
  const { slug } = useParams();
  
  const navigate = useNavigate();
  const [Data, setData] = useState();
  const [imageError, setImageError] = useState(false);
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);
  const role = useSelector((state) => state.auth.role);
  useEffect(() => {
    const fetchBook = async () => {
      try {
        const response = await axios.get(
          `http://localhost:1001/api/v1/get-book-by-slug/${slug}`,
        );
        setData(response.data);
      } catch (error) {
        console.error("Book load Error:", error);
      }
    };
    fetchBook();
  }, [slug]);

  const headers = {
    id: localStorage.getItem("id"),
    authorization: `Bearer ${localStorage.getItem("token")}`,
    bookid: Data ? Data._id : "",
  };

  const imageSrc = useMemo(() => {
    if (!Data?.url) return "";
    if (Data.url.startsWith("http://localhost:1001") && typeof window !== "undefined") {
      return Data.url.replace("http://localhost:1001", `http://${window.location.hostname}:1001`);
    }
    return Data.url;
  }, [Data?.url]);

  const handleFavourite = async () => {
    if (!Data) return;

    if (!isLoggedIn) {
      const current = getGuestFavourites();
      const exists = current.some((item) => item._id === Data._id);
      if (!exists) {
        current.push({
          _id: Data._id,
          slug: Data.slug,
          title: Data.title,
          author: Data.author,
          price: Data.price,
          url: Data.url,
        });
      }
      setCookie(GUEST_FAV_COOKIE, JSON.stringify(current), 60 * 60 * 24);
      alert(exists ? "Already in favourites (guest)" : "Added to favourites for 24 hours");
      return;
    }

    const response = await axios.put(
      "http://localhost:1001/api/v1/add-to-favourite",
      {},
      { headers },
    );
    alert(response.data.message);
  };

  const handleCart = async () => {
    const response = await axios.put(
      "http://localhost:1001/api/v1/add-to-cart",
      {},
      { headers },
    );
    alert(response.data.message);
  };

  const deleteBook = async () => {
    const response = await axios.delete("http://localhost:1001/api/v1/delete-book", { headers });
    alert(response.data.message);
    navigate("/all-books");
  };

  return (
    <>
      {Data && (
        <div className="w-[90%] max-w-[1200px] mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Part - Image */}
          <div className="w-full md:w-1/2">
            <div className="border border-gray-100 shadow-sm bg-white flex items-center justify-center p-8 transition-all hover:shadow-md">
              {!imageError && imageSrc ? (
                <img
                  src={imageSrc}
                  alt={Data.title}
                  className="max-h-[550px] w-auto object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-[300px] rounded bg-zinc-200 flex items-center justify-center text-zinc-500">
                  Image unavailable
                </div>
              )}
            </div>
          </div>

          {/* Right Part - Info */}
          <div className="w-full md:w-1/2 flex flex-col bg-zinc-200">
            <h1 className="text-4xl">{Data.title}</h1>
            <p className="text-zinc-400 mt-1">Author: {Data.author}</p>
            <p className="text-zinc-500 mt-4 text-xl">Description {Data.desc}</p>
            <p className="flex mt-4 items-center justify-start text-zinc-400">
              <GrLanguage className="me-3" />Languge {Data.language}
            </p>
            <p className="mt-4 text-zinc-100 text-3xl font-semibold">{Data.price} €</p>

            {role !== "admin" && (
              <div className="flex flex-row md:flex-col lg:flex-row items-center justify-between lg:justify-start mt-8 lg:mt-0">
                <button
                  className="bg-white rounded lg:rounded-full text-3xl md:p-3 text-red-400 flex items-center justify-center"
                  onClick={handleFavourite}
                >
                  <FaHeart />
                  <span className="ms-4 block">Favourites</span>
                </button>

                {isLoggedIn && (
                  <button
                    className="bg-white rounded mt-8 md:mt-0 lg:rounded-full text-3xl p-3 lg:mt-8 text-blue-400 flex items-center justify-center"
                    onClick={handleCart}
                  >
                    <FaShoppingCart />
                    <span className="ms-4 block">Add to cart</span>
                  </button>
                )}
              </div>
            )}
            
              {isLoggedIn && role === "admin" && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    to={`/update-book/${Data._id}`}
                    className="flex-1 bg-zinc-100 text-zinc-700 px-6 py-4 rounded-sm font-bold hover:bg-zinc-200 transition flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
                  >
                    <FaEdit />
                    <span className="ms-4 block lg:hidden">Edit Book</span>
                  </Link>
                  <button
                    className="flex-1 bg-red-50 text-red-600 px-6 py-4 rounded-sm font-bold hover:bg-red-100 transition flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
                    onClick={deleteBook}
                  >
                    <MdOutlineDelete />
                    <span className="ms-4 block lg:hidden">Delete Book</span>
                  </button>
                </div>
              )}
          </div>
        </div>
      )}
      {!Data && (
        <div className="h-screen bg-zinc-700 flex items-center justify-center">
          <Loader />
        </div>
      )}
    </>
  );
};

export default ViewBookDetails;
