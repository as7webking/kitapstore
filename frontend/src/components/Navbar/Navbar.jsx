import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaGripLines } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { authActions } from "../../store/auth";

const Navbar = () => {
  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);
  const role = useSelector((state) => state.auth.role);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [MobileNav, setMobileNav] = useState("hidden");

  // Handle login click (redirect if already logged in)
  const handleLoginClick = () => {
    if (isLoggedIn) {
      navigate("/profile");
    } else {
      navigate("/login");
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.clear();
    dispatch(authActions.logout());
    navigate("/login");
  };

  const links = [
    { title: "Home", link: "/" },
    { title: "All Books", link: "/all-books" },
    { title: "Cart", link: "/cart", auth: true },
    { title: "Profile", link: "/profile", auth: true, role: "user" },
    { title: "Admin Profile", link: "/profile", auth: true, role: "admin" },
  ];

  // Filter links based on auth and role
  const visibleLinks = links.filter((item) => {
    if (item.auth && !isLoggedIn) return false;
    if (item.role && item.role !== role) return false;
    return true;
  });

  return (
    <>
      <nav className="z-50 relative flex bg-zinc-700 text-white px-8 py-4">
        <div className="max-w-[1200px] w-[90%] mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src="./src/assets/logo.png" alt="logo" className="h-20 me-4" />
        </Link>

        <div className="nav-links-kitapstore block md:flex items-center gap-4">
          <div className="hidden md:flex gap-4">
            {visibleLinks.map((item) => (
              <div key={item.title} className="flex items-center">
                {item.title.includes("Profile") ? (
                  <Link
                    to={item.link}
                    className="px-4 py-1 border border-blue-400 rounded hover:bg-white hover:text-zinc-700 transition-all duration-300"
                  >
                    {item.title}
                  </Link>
                ) : (
                  <Link
                    to={item.link}
                    className="hover:text-blue-400 transition-all duration-300"
                  >
                    {item.title}
                  </Link>
                )}
              </div>
            ))}

            {!isLoggedIn && (
              <button
                onClick={handleLoginClick}
                className="px-4 py-1 border border-blue-400 rounded hover:bg-white hover:text-zinc-700 transition-all duration-300"
              >
                Log In
              </button>
            )}

            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="px-4 py-1 border border-red-400 rounded hover:bg-white hover:text-red-600 transition-all duration-300"
              >
                Logout
              </button>
            )}
          </div>

          <button
            className="block md:hidden text-white text-2xl hover:text-zinc-400"
            onClick={() =>
              setMobileNav(MobileNav === "hidden" ? "block" : "hidden")
            }
          >
            <FaGripLines />
          </button>
        </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={`${MobileNav} bg-zinc-700 h-screen absolute top-0 left-0 w-full z-40 flex flex-col items-center justify-center`}
      >
        {visibleLinks.map((item) => (
          <Link
            key={item.title}
            to={item.link}
            className="text-white text-4xl mb-8 font-semibold hover:text-blue-400 transition-all duration-300"
            onClick={() => setMobileNav("hidden")}
          >
            {item.title}
          </Link>
        ))}

        {!isLoggedIn && (
          <button
            onClick={handleLoginClick}
            className="px-8 mb-8 text-2xl font-semibold py-1 border border-blue-400 rounded text-white hover:bg-white hover:text-gray-700 transition-all duration-300"
          >
            Log In
          </button>
        )}

        {isLoggedIn && (
          <button
            onClick={handleLogout}
            className="px-8 mb-8 text-2xl font-semibold py-1 border border-red-400 rounded text-white hover:bg-white hover:text-red-600 transition-all duration-300"
          >
            Logout
          </button>
        )}
      </div>
    </>
  );
};

export default Navbar;

