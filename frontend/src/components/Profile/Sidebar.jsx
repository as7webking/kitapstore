import React from "react";
import { FaArrowRight } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { authActions } from "../../store/auth";
import { FaTrash } from "react-icons/fa6";
const Sidebar = ({ data, deleteAccount }) => {
  const dispatch = useDispatch();
  const history = useNavigate();
  const role = useSelector((state) => state.auth.role);
  return (
    <div className="bg-zinc-700 p-4 rounded flex flex-col items-center justify-between h-auto lg:h-[100]">
      <div className="flex items-center flex-col justify-center">
        <img src={data.avatar} alt="" className="h-[12vh]" />
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
          >
            Favourites
          </Link>
          <Link
            to="/profile/orderHistory"
            className="text-zinc-100 font-semibold w-full py-2 mt-4 text-center hover:bg-zinc-700 rounded transition-all duration-200"
          >
            Order History
          </Link>
          <Link
            to="/profile/settings"
            className="text-zinc-100 font-semibold w-full py-2 mt-4 text-center hover:bg-zinc-700 rounded transition-all duration-200"
          >
            Settings
          </Link>
        </div>
      )}
      {role === "admin" && (
        <div className="w-full flex-col items-center justify-center hidden lg:flex">
          <Link
            to="/profile"
            className="text-zinc-100 font-semibold w-full py-2 text-center hover:bg-zinc-700 rounded transition-all duration-200"
          >
            All Orders
          </Link>
          <Link
            to="/profile/add-book"
            className="text-zinc-100 font-semibold w-full py-2 mt-4 text-center hover:bg-zinc-700 rounded transition-all duration-200"
          >
            Add Book
          </Link>
        </div>
      )}
      {/* Delete Account Button */}
      <button
        className="bg-red-600 w-full text-white font-semibold flex items-center justify-center py-2 rounded hover:bg-red-700 transition-all duration-200"
        onClick={deleteAccount}
      >
        Delete Account <FaTrash className="ms-4" />
      </button>
      {/* Login-Logout Button */}
      <button
        className="bg-zinc-700 w-3/6 lg:w-full mt-4 lg:mt-0 text-white font-semibold flex items-center justify-center py-2 rounded hover:bg-white hover:text-zinc-700 transition-all duration-200"
        onClick={() => {
          dispatch(authActions.logout());
          dispatch(authActions.changeRole("user"));
          localStorage.clear("id");
          localStorage.clear("token");
          localStorage.clear("role");
          history("/");
        }}
      >
        Log Out <FaArrowRight className="ms-4" />
      </button>
    </div>
  );
};

export default Sidebar;
