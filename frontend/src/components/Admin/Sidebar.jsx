import { t } from '../../i18n/index.js';
import React from "react";
import { FaArrowRight } from "react-icons/fa";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../../auth/session.js";
import { FaTrash } from "react-icons/fa6";
const Sidebar = ({ data, deleteAccount }) => {
  const history = useNavigate();
  const role = useSelector((state) => state.auth.role);
  return (
    <div className="bg-zinc-700 p-4 rounded flex flex-col items-center justify-between h-auto lg:h-[100]">
      <div className="flex items-center flex-col justify-center">
        {data.avatar ? (
          <img src={data.avatar} alt="" className="h-[12vh]" />
        ) : (
          <div className="h-[12vh] w-[12vh] rounded-full bg-zinc-600">{t("profile:profile")}</div>
        )}
        <p className="mt-3 text-xl text-zinc-100 font-semibold">
          {data.username}
        </p>
        <p className="mt-1 text-normal text-zinc-200">{data.email}</p>
        <div className="w-full mt-4 h-[1px] bg-zinc-400 hidden lg:block"></div>
      </div>
      {role === "user" && (
        <div className="w-full flex-col items-center justify-center hidden lg:flex">
          <Link
            to="/profile"
            className="text-zinc-100 font-semibold w-full py-2 text-center hover:bg-zinc-700 rounded transition-all duration-200"
          >{t("profile:favourites")}</Link>
          <Link
            to="/profile/orderHistory"
            className="text-zinc-100 font-semibold w-full py-2 mt-4 text-center hover:bg-zinc-700 rounded transition-all duration-200"
          >{t("profile:order_history")}</Link>
          <Link
            to="/profile/settings"
            className="text-zinc-100 font-semibold w-full py-2 mt-4 text-center hover:bg-zinc-700 rounded transition-all duration-200"
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
            to="/profile/add-blog"
            className="text-zinc-100 font-semibold w-full py-2 mt-4 text-center hover:bg-zinc-700 rounded transition-all duration-200"
          >{t("profile:add_blog")}</Link>
        </div>
      )}
      {/* Delete Account Button */}
      <button
        className="bg-red-600 w-full text-white font-semibold flex items-center justify-center py-2 rounded hover:bg-red-700 transition-all duration-200"
        onClick={deleteAccount}
      >{t("profile:delete_account")}<FaTrash className="ms-4" />
      </button>
      {/* Login-Logout Button */}
      <button
        className="bg-zinc-700 text-white font-semibold flex items-center justify-center py-2 rounded hover:bg-white hover:text-zinc-700 transition-all duration-400"
        onClick={async () => {
          try { await logout(); history("/login"); }
          catch { alert(t("profile:could_not_log_out_check_your_connection_and_try_again")); }
        }}
      >{t("profile:log_out")}<FaArrowRight className="ms-4" />
      </button>
    </div>
  );
};

export default Sidebar;
