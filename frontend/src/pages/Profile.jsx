import { authActions } from "../store/auth";
import { API_BASE_URL } from "../config/api.js";
import React, { useEffect, useState } from "react";
import Sidebar from "../components/Profile/Sidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import axios from "axios";
import Loader from "../components/Loader/Loader";
import MobileNav from "../components/Profile/MobileNav";
const Profile = () => {
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
          `${API_BASE_URL}/api/v1/user/delete-account`,
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
    const fetchProfile = async () => {
      const params = new URLSearchParams(window.location.search);
      const callbackToken = params.get("token");
      const token = callbackToken || localStorage.getItem("token");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/v1/user/get-user-information`,
          { headers: { authorization: `Bearer ${token}` } },
        );
        if (callbackToken) {
          localStorage.setItem("token", callbackToken);
          localStorage.setItem("id", response.data._id);
          localStorage.setItem("role", response.data.role);
          dispatch(authActions.login());
          dispatch(authActions.changeRole(response.data.role));
          navigate(window.location.pathname, { replace: true });
        }
        setProfile(response.data);
      } catch (error) {
        console.error("Error fetching user data");
        if (error.response?.status === 401 || error.response?.status === 403) {
          navigate("/login", { replace: true });
        }
      }
    };
    fetchProfile();
  }, [dispatch, navigate]);

  return (
    <section className="bg-zinc-700">
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

export default Profile;
