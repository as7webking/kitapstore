import React, { useEffect, useState } from "react";
import Sidebar from "../components/Profile/Sidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import Loader from "../components/Loader/Loader";
import MobileNav from "../components/Profile/MobileNav";
const Admin = () => {
  //const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [Profile, setProfile] = useState();
  const headers = {
    id: localStorage.getItem("id"),
    authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  // --- DELETE ACCOUNT LOGIC ---
  const deleteAccount = async () => {
    // Confirmation dialog before proceeding
    if (
      window.confirm(
        "Are you sure you want to delete your account? This action is permanent!",
      )
    ) {
      try {
        const response = await axios.delete(
          "http://localhost:1001/api/v1/user/delete-account",
          { headers },
        );
        alert(response.data.message);

        // Log out the user after successful deletion
        dispatch(authActions.logout());
        dispatch(authActions.changeRole("user"));
        localStorage.clear();
        navigate("/");
      } catch (error) {
        console.error("Error deleting account:", error);
        alert(error.response?.data?.message || "Failed to delete account");
      }
    }
  };

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await axios.get(
          "http://localhost:1001/api/v1/user/get-user-information",
          { headers },
        );
        setProfile(response.data);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetch();
  }, []);

  return (
    <section className="bg-zinc-700">
      <h1>Admin Profile</h1>
      <div className="w-[90%] max-w-[1200px] mx-auto px-2 md:px-12 flex flex-col md:flex-row py-8 gap-4 text-zinc-100">
        {!Profile && (
          <div className="h-[100%] flex items-center justify-center  w-[90%] max-w-[1200px] mx-auto ">
            <Loader />
          </div>
        )}
        {Profile && (
          <>
            <div className="w-full md:w-1/6 h-auto lg:h-screen">
              <Sidebar data={Profile} deleteAccount={deleteAccount} />
              <MobileNav />
            </div>
            <div className="w-full md:w-5/6">
              <Outlet />
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Admin;
