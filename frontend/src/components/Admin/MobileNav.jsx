import { t } from '../../i18n/index.js';
import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
const MobileNav = () => {
  const role = useSelector((state) => state.auth.role);
  return (
    <>
      {role === "user" && (
        <div className="w-full flex lg:hidden items-center justify-between mt-4">
          <Link
            to="/profile"
            className="text-zinc-100 font-semibold w-full text-center hover:bg-zinc-700 rounded transition-all duration-200"
          >{t("profile:favourites")}</Link>
          <Link
            to="/profile/orderHistory"
            className="text-zinc-100 font-semibold w-full text-center hover:bg-zinc-700 rounded transition-all duration-200"
          >{t("profile:order_history")}</Link>
          <Link
            to="/profile/settings"
            className="text-zinc-100 font-semibold w-full text-center hover:bg-zinc-700 rounded transition-all duration-200"
          >{t("profile:settings")}</Link>
        </div>
      )}
      {role === "admin" && (
        <div className="w-full flex-col items-center justify-center hidden lg:flex">
          <Link
            to="/profile"
            className="text-zinc-100 font-semibold w-full py-2 text-center hover:bg-zinc-700 rounded transition-all duration-200"
          >{t("profile:all_orders")}</Link>
          <Link
            to="/profile/add-book"
            className="text-zinc-100 font-semibold w-full py-2 mt-4 text-center hover:bg-zinc-700 rounded transition-all duration-200"
          >{t("profile:add_book")}</Link>
        </div>
      )}
    </>
  );
};

export default MobileNav;
