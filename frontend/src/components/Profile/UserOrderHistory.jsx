import React, { useEffect, useState } from "react"; // ADDED: useState import
import axios from "axios";
import { Link, useNavigate } from "react-router-dom"; // ADDED: useNavigate for redirecting
// FIXED: Removed problematic relative import and defined Loader locally for compilation
// import Loader from "../Loader/Loader"; 

// Temporary Loader component definition to resolve the import error
const Loader = () => (
  <div className="flex flex-col items-center justify-center p-4">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    <p className="mt-3 text-sm text-zinc-400">Loading...</p>
  </div>
);

const UserOrderHistory = () => {
  const [orderHistory, setOrderHistory] = useState(null); // RENAMED: to camelCase, initialized to null
  const navigate = useNavigate();

  const headers = {
    id: localStorage.getItem("id"),
    authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  useEffect(() => {
    // Check for tokens before attempting to fetch
    if (!localStorage.getItem("token") || !localStorage.getItem("id")) {
      navigate("/Login");
      return;
    }

    const fetchOrderHistory = async () => {
      try {
        const response = await axios.get(
          "http://localhost:1001/api/v1/get-order-history",
          { headers }
        );
        // Assuming data is located in response.data.data
        setOrderHistory(response.data.data);
      } catch (error) {
        console.error("Error fetching order history:", error);
        
        // ERROR HANDLING: Handle 403 (Forbidden) or 401 (Unauthorized) errors
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          // If token is invalid/expired, clear storage and redirect
          localStorage.removeItem("id");
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          console.error("Session expired. Redirecting to login."); 
          navigate("/Login");
        }
        setOrderHistory([]); // Set to empty array on general failure to stop the Loader
      }
    };
    fetchOrderHistory();
  }, [navigate]); // Added navigate dependency

  // Show Loader while fetching data
  if (orderHistory === null) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader />
      </div>
    );
  }

  // Show empty state if no history is found
  if (orderHistory.length === 0) {
    return (
      <div className="h-[80vh] p-4 text-white">
        <div className="h-full flex flex-col items-center justify-center bg-zinc-800 rounded-lg shadow-xl">
          <h1 className="text-5xl font-semibold text-zinc-400 mb-8">
            No order history
          </h1>
          <p className="text-zinc-500">Похоже, вы еще ничего не заказывали.</p>
          <img 
            src="https://placehold.co/100x100/3F3F46/FFFFFF?text=Book" 
            alt="No orders" 
            className="h-[20vh] mb-8 mt-4 rounded-lg" 
          />
          <Link to="/" className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-all">
            Начать покупки
          </Link>
        </div>
      </div>
    );
  }
  
  // Render order history table
  return (
    <div className="h-[100%] p-0 md:p-4 text-zinc-100">
      <h1 className="text-4xl font-bold text-white mb-6">All Orders</h1>
      
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
        {orderHistory.map((items, i) => (
          <div 
            key={i} // FIXED: Added unique key prop for list items
            className="bg-zinc-700 w-full rounded py-4 px-4 flex gap-4 transition-all duration-300 hover:bg-zinc-600 shadow-md items-center"
          >
            <div className="w-[3%] text-center text-zinc-400">{i + 1}</div>
            <div className="w-[22%]">
              <Link 
                to={`/view-book-details/${items.book._id}`} 
                className="hover:text-blue-400 font-medium line-clamp-2"
              >
                {items.book.title}
              </Link>
            </div>
            <div className="w-[45%] hidden md:block text-sm text-zinc-400">
              {/* Using a fallback description */}
              {items.book.description ? items.book.description.substring(0, 100) + '...' : 'Описание отсутствует.'}
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
              ) : ( // Default status (e.g., Delivered)
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
    </div>
  );
};

export default UserOrderHistory;