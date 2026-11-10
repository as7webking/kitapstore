import FailureState from '../errors/FailureState.jsx';
import { useApiResource } from '../errors/useApiResource.js';
import { t, translateMessage } from '../i18n/index.js';
import { clearSession } from "../auth/session.js";
import { API_BASE_URL } from "../config/api.js";
import React from "react";
import Sidebar from "../components/Profile/Sidebar";
import { Outlet, useNavigate } from "react-router-dom";
import axios from "axios";
import Loader from "../components/Loader/Loader";
import MobileNav from "../components/Profile/MobileNav";
const Admin = () => {
  //const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);
  const navigate = useNavigate();
  const { data: Profile, error, retry } = useApiResource(`${API_BASE_URL}/api/v1/user/get-user-information`, false);
  const headers = {
    id: localStorage.getItem("id"),
    authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  // --- DELETE ACCOUNT LOGIC ---
  const deleteAccount = async () => {
    // Confirmation dialog before proceeding
    if (
      window.confirm(
        t("profile:confirm_delete_account"),
      )
    ) {
      try {
        const response = await axios.delete(
          `${API_BASE_URL}/api/v1/user/delete-account`,
          { headers },
        );
        alert(translateMessage(response.data));

        // Log out the user after successful deletion
        clearSession();
        navigate("/");
      } catch (error) {
        console.error("Error deleting account:", error);
        alert(translateMessage(error.response?.data || "profile:failed_to_delete_account"));
      }
    }
  };

  if (error) return <FailureState kind={error} onRetry={retry} />;

  return (
    <section className="bg-zinc-700">
      <h1>{t("profile:admin_profile")}</h1>
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
