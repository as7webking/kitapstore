import { formatNumber, t, translateMessage } from '../i18n/index.js';
import { API_BASE_URL } from "../config/api.js";
import React, { useEffect, useState, useRef } from "react";
import Loader from "../components/Loader/Loader";
import axios from "axios";
import { checkoutAttempt, cartTotalCents } from '../cart/checkout.js';
import { AiFillDelete } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
// Currency is a domain value, not a translatable label.
const currency = 'EUR';
const Cart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const attempt = useRef(null);
  const Total = cartTotalCents(cart || []) / 100;
  const headers = {
    id: localStorage.getItem("id"),
    authorization: `Bearer ${localStorage.getItem("token")}`,
  };
  useEffect(() => {
    const fetchCart = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/v1/get-user-cart`);
        setCart(res.data.data);
      } catch { setMessage('common:network_error'); setCart([]); }
    };
    fetchCart();
  }, []);
  const deleteItem = async (bookid) => {
    if (busy.current) return;
    busy.current = true; setPending(true);
    setMessage('');
    try {
    const response = await axios.put(
      `${API_BASE_URL}/api/v1/remove-from-cart/${bookid}`,
      {},
      { headers }
    );
    setCart((current) => current.filter((book) => book._id !== bookid));
    attempt.current = null;
    setMessage(response.data);
    } catch (error) { setMessage(error.response?.data || 'common:network_error'); }
    finally { busy.current = false; setPending(false); }
  };
  const PlaceOrder = async () => {
    if (busy.current || !cart?.length) return;
    busy.current = true;
    setPending(true); setMessage('');
    try {
      attempt.current ||= checkoutAttempt(cart, localStorage.getItem('id'));
      const response = await axios.post(`${API_BASE_URL}/api/v1/place-order`,
        { order: attempt.current.order }, { headers: { 'Idempotency-Key': attempt.current.key } });
      try { sessionStorage.removeItem(attempt.current.storageKey); } catch { /* Memory-only storage. */ }
      setCart([]);
      navigate('/profile/orderHistory', { state: { message: response.data } });
    } catch (error) {
      setMessage(error.response?.data || 'common:network_error');
    } finally { busy.current = false; setPending(false); }
  };
  return (
    <div className="bg-zinc-700 px-4 sm:px-12 min-h-screen p-8">
      {message && <p role="status" className="text-zinc-100">{translateMessage(message)}</p>}
      {!cart && (
        <div className="w-full h-[100%] flex items-center justify-center">
          <Loader />
        </div>
      )}
      {cart && cart.length === 0 && (
        <div className="h-screen">
          <div className="h-[100%] flex items-center justify-center flex-col">
            <h1 className="text-center text-3xl sm:text-5xl lg:text-6xl font-semibold text-zinc-400">{t("cart:empty_cart")}</h1>
          </div>
        </div>
      )}
      {cart && cart.length > 0 && (
        <>
          <h1 className="text-3xl sm:text-5xl font-semibold text-zinc-400 mb-8">{t("cart:your_cart")}</h1>
          {cart.map((items, i) => (
            <div
              className="w-full my-4 rounded flex flex-col md:flex-row gap-4 min-w-0 p-4 bg-zinc-700 justify-between items-center"
              key={i}
            >
              <img
                src={items.url}
                alt={items.available === false ? t('cart:unavailable_item') : items.title}
                className="h-[20vh] md:h-[10vh] max-w-full shrink-0 object-contain"
              />
              <div className="min-w-0 w-full md:flex-1">
                <h1 className="text-2xl text-zinc-100 font-semibold text-start mt-2 md:mt-0">
                  {items.available === false ? t('cart:unavailable_item') : items.title}
                </h1>
                <p className="text-normal text-zinc-200 mt-2 hidden lg:block">
                  {(items.desc || '').slice(0, 100)}...
                </p>
                <p className="text-normal text-zinc-200 mt-2 hidden md:block lg:hidden">
                  {(items.desc || '').slice(0, 65)}...
                </p>
                <p className="text-normal text-zinc-200 mt-2 hidden lg:hidden">
                  {(items.desc || '').slice(0, 100)}...
                </p>
              </div>
              <div className="flex gap-3 mt-4 min-w-0 w-full md:w-auto flex-wrap items-center justify-between">
                <h2 className="text-zinc-100 text-2xl sm:text-3xl font-semibold">
                  {formatNumber(items.price)}{" "}{currency}</h2>
                <button
                  className="bg-red-100 text-red-700 border border-red-700 rounded min-h-11 min-w-11 p-2"
                  disabled={pending}
                  aria-label={t('cart:remove_item')}
                  onClick={() => deleteItem(items._id)}
                >
                  <AiFillDelete />
                </button>
              </div>
            </div>
          ))}
        </>
      )}
      {cart && cart.length > 0 && (
        <div className="mt-4 w-full flex items-center justify-end">
          <div className="w-full max-w-md min-w-0 p-4 bg-zinc-700 rounded">
            <h1 className="text-3xl text-zinc-200 font-semibold">{t("cart:total_amount")}</h1>
            <div className="mt-3 flex flex-wrap gap-3 items-center justify-between text-xl text-zinc-200">
              <h2>{t("catalog:book_count", { count: cart.length })}</h2>
              <h2>{formatNumber(Total)}{" "}{currency}</h2>
            </div>
            <div className="w-[100%] mt-3">
              <p className="text-zinc-200 text-sm">{t('cart:shipping_included')}</p>
              <button type="button" disabled={pending || cart.some((book) => book.available === false)}
                className="bg-zinc-100 rounded min-h-11 px-4 py-2 flex justify-center w-full font-semibold hover:bg-zinc-200 disabled:opacity-60"
                onClick={PlaceOrder}
              >{pending ? t('cart:placing_order') : t('cart:place_your_order')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
