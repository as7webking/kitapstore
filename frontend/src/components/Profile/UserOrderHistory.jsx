import FailureState from '../../errors/FailureState.jsx';
import { useApiResource } from '../../errors/useApiResource.js';
import { formatNumber, t, translateMessage } from '../../i18n/index.js';
import { API_BASE_URL } from "../../config/api.js";
import React from "react"; // ADDED: useState import
import { Link, useLocation } from "react-router-dom"; // ADDED: useNavigate for redirecting
// FIXED: Removed problematic relative import and defined Loader locally for compilation
// import Loader from "../Loader/Loader"; 

// Temporary Loader component definition to resolve the import error
const Loader = () => (
  <div className="flex flex-col items-center justify-center p-4">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    <p className="mt-3 text-sm text-zinc-400">{t("orders:loading")}</p>
  </div>
);

const UserOrderHistory = () => {
  const location = useLocation();
  const { data: orderHistory, error, retry } = useApiResource(`${API_BASE_URL}/api/v1/get-order-history`);




  if (error) return <FailureState kind={error} onRetry={retry} />;
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
          <h1 className="text-5xl font-semibold text-zinc-400 mb-8">{t("orders:no_order_history")}</h1>
          <p className="text-zinc-500">{t("orders:you_have_not_placed_any_orders_yet")}</p>
          <img 
            src="https://placehold.co/100x100/3F3F46/FFFFFF?text=Book" 
            alt={t("orders:no_orders")}
            className="h-[20vh] mb-8 mt-4 rounded-lg" 
          />
          <Link to="/" className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-all">{t("orders:browse_books")}</Link>
        </div>
      </div>
    );
  }
  
  // Render order history table
  return (
    <div className="h-[100%] p-0 md:p-4 text-zinc-100">
      {location.state?.message && <p role="status" className="mb-4">{translateMessage(location.state.message)}</p>}
      <h1 className="text-4xl font-bold text-white mb-6">{t("orders:all_orders")}</h1>
      
      {/* Table Header */}
      <div className="bg-zinc-700 w-full rounded py-3 px-4 flex gap-4 text-sm md:text-base font-semibold border-b border-zinc-600">
        <div className="w-[3%] text-center">№</div>
        <div className="w-[22%]">{t("orders:books")}</div>
        <div className="w-[45%] hidden md:block">{t("orders:description")}</div>
        <div className="w-[9%] text-right">{t("orders:price")}</div>
        <div className="w-[16%] text-center">{t("orders:status")}</div>
        <div className="w-[5%] hidden md:block text-center">{t("orders:method")}</div>
      </div>

      {/* Order List */}
      <div className="space-y-2 mt-2">
        {orderHistory.map((items, i) => (
          <div 
            key={items.lineId || items._id}
            className="bg-zinc-700 w-full rounded py-4 px-4 flex gap-4 transition-all duration-300 hover:bg-zinc-600 shadow-md items-center"
          >
            <div className="w-[3%] text-center text-zinc-400">{formatNumber(i + 1)}</div>
            <div className="w-[22%]">
              <Link 
                to={`/view-book-details/${items.book.slug || items.book._id}`}
                className="hover:text-blue-400 font-medium line-clamp-2"
              >
                {items.book.title || t('cart:unavailable_item')}
              </Link>
            </div>
            <div className="w-[45%] hidden md:block text-sm text-zinc-400">
              {/* Using a fallback description */}
              {items.book.desc ? items.book.desc.substring(0, 100) + '...' : t("orders:no_description_available")}
            </div>
            <div className="w-[9%] text-right font-bold text-lg">
              {items.book.price == null ? t('orders:n_a') : `${formatNumber(items.lineTotalCents !== undefined ? items.lineTotalCents / 100 : items.book.price)} €`}
              {items.quantity > 1 && <span className="block text-xs">{t('orders:quantity', { count: items.quantity })}</span>}
            </div>
            
            <div className="w-[16%] text-center">
              {/* FIXED: Corrected ternary operator syntax */}
              {items.status === "Order Placed" ? (
                <div className="font-semibold text-yellow-400 bg-yellow-900/50 p-1 rounded-full text-xs">
                  {translateMessage(items.status)}
                </div>
              ) : items.status === "Canceled" ? (
                <div className="font-semibold text-red-400 bg-red-900/50 p-1 rounded-full text-xs">
                  {translateMessage(items.status)}
                </div>
              ) : ( // Default status (e.g., Delivered)
                <div className="font-semibold text-green-400 bg-green-900/50 p-1 rounded-full text-xs">
                  {translateMessage(items.status)}
                </div>
              )}
            </div>
            
            <div className="w-[5%] hidden md:block text-center">
              <h1 className="text-sm text-zinc-400">{t("orders:n_a")}</h1>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserOrderHistory;