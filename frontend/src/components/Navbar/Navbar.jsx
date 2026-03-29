import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaSearch, FaHeart, FaUserCircle, FaBars, FaTimes } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { authActions } from "../../store/auth";
import axios from "axios";

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = useSelector((state) => state.auth.isLoggedIn);
  const user = useSelector((state) => state.auth.user);
  const token = localStorage.getItem("token");

  const [profileOpen, setProfileOpen] = useState(false);
  const [favOpen, setFavOpen] = useState(false);
  const [favourites, setFavourites] = useState([]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHome = location.pathname === "/";
  const navbarBg = useMemo(() => {
    if (!isHome) return "bg-zinc-700 border-b border-white";
    return scrolled ? "bg-zinc-700 border-b border-white" : "bg-transparent";
  }, [isHome, scrolled]);

  const closeAll = () => {
    setProfileOpen(false);
    setFavOpen(false);
    setSearchOpen(false);
    setMobileMenuOpen(false);
  };

  const toggleProfile = () => {
    setProfileOpen((v) => {
      const next = !v;
      if (next) {
        setFavOpen(false);
        setSearchOpen(false);
        setMobileMenuOpen(false);
      }
      return next;
    });
  };

  const toggleFav = () => {
    setFavOpen((v) => {
      const next = !v;
      if (next) {
        setProfileOpen(false);
        setSearchOpen(false);
        setMobileMenuOpen(false);
      }
      return next;
    });
  };

  const toggleSearchDesktop = () => {
    setSearchOpen((v) => {
      const next = !v;
      if (next) {
        setProfileOpen(false);
        setFavOpen(false);
        setMobileMenuOpen(false);
      }
      return next;
    });
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen((v) => {
      const next = !v;
      if (next) {
        setProfileOpen(false);
        setFavOpen(false);
        setSearchOpen(false);
      }
      return next;
    });
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    closeAll();
  }, [location.pathname]);

  useEffect(() => {
    if (!isLoggedIn || user?.role === "admin") return;

    const fetchFavourites = async () => {
      try {
        const res = await axios.get(
          "http://localhost:1001/api/v1/favourites/get-favourite-books",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              id: user?.id || localStorage.getItem("id"),
            },
          }
        );
        setFavourites(res.data.data || []);
      } catch {
        setFavourites([]);
      }
    };

    fetchFavourites();
  }, [isLoggedIn, user?.role]);

  const favouritesCount = favourites.length;

  const handleLogout = () => {
    localStorage.clear();
    dispatch(authActions.logout());
    navigate("/login");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setSearchQuery("");
    setSearchOpen(false);
  };

  const onFavClickDesktop = () => {
    if (!isLoggedIn || user?.role === "admin" || favouritesCount === 0) {
      toggleFav();
      return;
    }
    closeAll();
    navigate("/favourites");
  };

  const onFavClickMobile = () => {
    if (!isLoggedIn || user?.role === "admin" || favouritesCount === 0) {
      toggleFav();
      return;
    }
    closeAll();
    navigate("/favourites");
  };

  return (
    <nav
      className={`fixed top-0 left-0 w-full h-[75px] text-white z-50 transition-colors duration-300 ${navbarBg} `}
    >
      <div className="max-w-[1200px] h-full mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center shrink-0">
          <img src="/src/assets/logo.png" alt="logo" className="h-10 object-contain" />
        </Link>

        <div className="hidden md:flex items-center justify-center gap-8 text-sm font-medium flex-1">
          <Link to="/" className="hover:text-blue-300">Home</Link>
          <Link to="/all-books" className="hover:text-blue-300">Books</Link>
          <Link to="/blog" className="hover:text-blue-300">Blog</Link>
          <Link to="/contact" className="hover:text-blue-300">Contact</Link>
        </div>

        <div className="flex items-center justify-center gap-4 shrink-0 relative">
          {/* Desktop / Tablet */}
          <div className="hidden md:flex items-center gap-4 relative">
            <button
              type="button"
              onClick={toggleSearchDesktop}
              className="text-white"
              aria-label="Search"
            >
              <FaSearch size={18} />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={onFavClickDesktop}
                className="text-white relative"
                aria-label="Favourites"
              >
                <FaHeart size={18} />
                {favouritesCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-xs rounded-full px-1">
                    {favouritesCount}
                  </span>
                )}
              </button>

              {favOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-zinc-800 rounded shadow-lg px-4 py-3 text-sm text-zinc-200">
                  {user?.role === "admin"
                    ? "Admins cannot use favourites"
                    : !isLoggedIn
                      ? "Log in to use favourites"
                      : favouritesCount === 0
                        ? "No favourite books"
                        : null}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={toggleProfile}
                className="text-white"
                aria-label="Profile"
              >
                <FaUserCircle size={22} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-3 w-40 bg-zinc-800 rounded shadow-lg overflow-hidden">
                  {!isLoggedIn ? (
                    <button
                      onClick={() => {
                        closeAll();
                        navigate("/login");
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-zinc-700"
                    >
                      Log in
                    </button>
                  ) : (
                    <>
                      <Link
                        to="/profile"
                        onClick={closeAll}
                        className="block px-4 py-2 hover:bg-zinc-700"
                      >
                        Profile
                      </Link>
                      <button
                        onClick={() => {
                          closeAll();
                          handleLogout();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-zinc-700 text-red-300"
                      >
                        Logout
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <form
              onSubmit={handleSearchSubmit}
              className={`absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 overflow-hidden
              bg-zinc-700 rounded transition-all duration-300
              ${searchOpen ? "w-[420px] px-3 py-2" : "w-0 px-0 py-0"}`}
              style={{ zIndex: 60 }}
            >
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`bg-transparent outline-none text-sm w-full ${
                  searchOpen ? "opacity-100" : "opacity-0"
                } transition-opacity duration-200`}
                placeholder="Search books..."
              />
              <button
                type="submit"
                className={`${
                  searchOpen ? "opacity-100" : "opacity-0"
                } transition-opacity duration-200`}
                aria-label="Submit search"
              >
                <FaSearch size={16} />
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className={`${
                  searchOpen ? "opacity-100" : "opacity-0"
                } transition-opacity duration-200`}
                aria-label="Close search"
              >
                <FaTimes size={16} />
              </button>
            </form>
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center gap-4 relative">
            <div className="relative flex items-center gap-4">
              <button
                type="button"
                onClick={onFavClickMobile}
                className="text-white relative"
                aria-label="Favourites"
              >
                <FaHeart size={18} />
                {favouritesCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-xs rounded-full px-1">
                    {favouritesCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={toggleProfile}
                className="text-white"
                aria-label="Profile"
              >
                <FaUserCircle size={22} />
              </button>

              {favOpen && (
                <div className="absolute left-0 mt-12 w-56 bg-zinc-800 rounded shadow-lg px-4 py-3 text-sm text-zinc-200">
                  {user?.role === "admin"
                    ? "Admins cannot use favourites"
                    : !isLoggedIn
                      ? "Log in to use favourites"
                      : favouritesCount === 0
                        ? "No favourite books"
                        : null}
                </div>
              )}

              {profileOpen && (
                <div className="absolute left-12 mt-12 w-40 bg-zinc-800 rounded shadow-lg overflow-hidden">
                  {!isLoggedIn ? (
                    <button
                      onClick={() => {
                        closeAll();
                        navigate("/login");
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-zinc-700"
                    >
                      Log in
                    </button>
                  ) : (
                    <>
                      <Link
                        to="/profile"
                        onClick={closeAll}
                        className="block px-4 py-2 hover:bg-zinc-700"
                      >
                        Profile
                      </Link>
                      <button
                        onClick={() => {
                          closeAll();
                          handleLogout();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-zinc-700 text-red-300"
                      >
                        Logout
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={toggleSearchDesktop}
                className="text-white"
                aria-label="Search"
              >
                <FaSearch size={18} />
              </button>

              <form
                onSubmit={handleSearchSubmit}
                className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 flex items-center gap-2 overflow-hidden
                bg-zinc-800 rounded transition-all duration-300
                ${searchOpen ? "w-[240px] px-3 py-2" : "w-0 px-0 py-0"}`}
                style={{ zIndex: 60 }}
              >
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`bg-transparent outline-none text-sm w-full ${
                    searchOpen ? "opacity-100" : "opacity-0"
                  } transition-opacity duration-200`}
                  placeholder="Search..."
                />
                <button
                  type="submit"
                  className={`${
                    searchOpen ? "opacity-100" : "opacity-0"
                  } transition-opacity duration-200`}
                  aria-label="Submit search"
                >
                  <FaSearch size={16} />
                </button>
              </form>
            </div>

            <button
              type="button"
              className="text-white"
              onClick={toggleMobileMenu}
              aria-label="Menu"
            >
              <FaBars size={18} />
            </button>
          </div>
        </div>
      </div>

      <div
        className={`md:hidden bg-zinc-800 overflow-hidden transition-all duration-300 ${
          mobileMenuOpen ? "max-h-64" : "max-h-0"
        }`}
      >
        <div className="px-6 py-4 flex flex-col items-center gap-3 text-sm">
          <Link to="/" className="hover:text-blue-300">Home</Link>
          <Link to="/all-books" className="hover:text-blue-300">Books</Link>
          <Link to="/blog" className="hover:text-blue-300">Blog</Link>
          <Link to="/contact" className="hover:text-blue-300">Contact</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
