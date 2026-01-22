import React, { useState, useEffect } from "react";
import Loader from "../components/Loader/Loader";
import { FaUserLarge } from "react-icons/fa6";
import axios from "axios";
import { Link } from "react-router-dom";
import { IoOpenOutline } from "react-icons/io5";
import { FaCheck } from "react-icons/fa6";
import SeeUserData from "./SeeUserData";
const AllOrders = () => {
  const [AllOrders, setAllOrders] = useState([]);
  const [Options, setOptions] = useState(-1);
  const [Values, setValues] = useState({ status: "" });
  const [userDiv, setuserDiv] = useState("hidden");
  const [userDivData, setuserDivData] = useState();
  const headers = {
    id: localStorage.getItem("id"),
    authorization: `Bearer ${localStorage.getItem("token")}`,
  };
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get(
          "http://localhost:1001/api/v1/get-all-orders",
          { headers }
        );
        setAllOrders(response.data.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchOrders();
  }, []);

  return (
    <>
      {!AllOrders && (
        <div className="h-[199%] flex items-center justify-center">
          <Loader />
        </div>
      )}

      {AllOrders && AllOrders.length > 0 && (
        <div className="h-[100%] p-0 md:p-4 text-zinc-100">
          <h1 className="text-3xl md:text-5xl font-semibold text-zinc-400 mb-8">
            All Orders
          </h1>

          {/* Table Header */}
          <div className="bg-zinc-700 w-full rounded py-3 px-4 flex gap-4 text-sm md:text-base font-semibold border-b border-zinc-600">
            <div className="w-[3%] text-center">№</div>
            <div className="w-[22%]">Books</div>
            <div className="w-[45%] hidden md:block">Description</div>
            <div className="w-[9%] text-right">Price</div>
            <div className="w-[16%] text-center">Status</div>
            <div className="w-[5%] hidden md:block text-center">Способ</div>
          </div>

          {/* Order List */}
          <div className="space-y-2 mt-2">
            {AllOrders.map((items, i) => (
              <div
                key={i} // FIXED: Added unique key prop for list items
                className="bg-zinc-700 w-full rounded py-4 px-4 flex gap-4 transition-all duration-300 hover:bg-zinc-600 shadow-md items-center"
              >
                <div className="w-[3%] text-center text-zinc-400">{i + 1}</div>
                <div className="w-[22%]">
                  <Link
                    to={`/view-book-details/${items.book.slug}`}
                    className="hover:text-blue-400 font-medium line-clamp-2"
                  >
                    {items.book.title}
                  </Link>
                </div>
                <div className="w-[45%] hidden md:block text-sm text-zinc-400">
                  {/* Using a fallback description */}
                  {items.book.description
                    ? items.book.description.substring(0, 100) + "..."
                    : "Описание отсутствует."}
                </div>
                <div className="w-[9%] text-right font-bold text-lg">
                  {items.book.price} €
                </div>

                <div className="w-[16%] text-center">
                  {/* FIXED: Corrected ternary operator syntax */}
                  {items.status === "Order placed" ? (
                    <div className="font-semibold text-yellow-400 bg-yellow-900/50 p-1 rounded-full text-xs">
                      {items.status}
                    </div>
                  ) : items.status === "Cancelled" ? (
                    <div className="font-semibold text-red-400 bg-red-900/50 p-1 rounded-full text-xs">
                      {items.status}
                    </div>
                  ) : (
                    // Default status (e.g., Delivered)
                    <div className="font-semibold text-green-400 bg-green-900/50 p-1 rounded-full text-xs">
                      {items.status}
                    </div>
                  )}
                </div>

                <div className="w-[5%] hidden md:block text-center">
                  <h1 className="text-sm text-zinc-400">N/A</h1>
                </div>
              </div>
            ))}
          </div>
          {/* {AllOrders.map((items, i) => (
            <div>Hello</div>
          ))} */}
        </div>
      )}

      {userDivData && (
        <SeeUserData
          userDivData={userDivData}
          userDiv={userDiv}
          setuserDiv={setuserDiv}
        />
      )}
    </>
  );
};

export default AllOrders;
