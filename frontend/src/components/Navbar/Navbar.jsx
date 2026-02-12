import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
  const [favouritesOpen, setFavouritesOpen] = useState(false);
  const [favourites, setFavourites] = useState([]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // SEARCH: slide-out
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // navbar bg
  const [scrolled, setScrolled] = useState(false);
  const isHome = location.pathname === "/";
  const navbarBg = () => (!isHome ? "bg-zinc-700" : scrolled ? "bg-zinc-700" : "bg-transparent");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close on route change
  useEffect(() => {
    setProfileOpen(false);
    setFavouritesOpen(false);
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  // ESC closes
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setProfileOpen(false);
        setFavouritesOpen(false);
        setMobileMenuOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // fetch favourites
  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;

    const fetchFavourites = async () => {
      try {
        const res = await axios.get(
          "http://localhost:1001/api/v1/favourite/get-favourite-books",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              id: user.id,
            },
          }
        );
        setFavourites(res.data?.data || []);
      } catch {
        setFavourites([]);
      }
    };

    fetchFavourites();
  }, [isLoggedIn, user?.id]);

  const favouritesCount = favourites.length;

  const handleLogout = () => {
    localStorage.clear();
    dispatch(authActions.logout());
    navigate("/login");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery("");
    setSearchOpen(false);
  };

  const onHeartClick = () => {
    // сердечко всегда одного цвета → не меняем цвет, просто логика клика:
    if (!isLoggedIn) {
      setFavouritesOpen(false);
      navigate("/login");
      return;
    }
    if (favouritesCount === 0) {
      setFavouritesOpen((p) => !p); // покажем “No favourites”
      return;
    }
    navigate("/favourites"); // если есть — сразу на страницу
  };

  return (
    <nav className={`fixed top-0 left-0 w-full h-[75px] text-white z-50 transition-colors duration-300 ${navbarBg()}`}>
      <div className="max-w-[1200px] h-full mx-auto flex items-center justify-between px-4 md:px-6 relative">
        {/* LEFT: Burger (mobile) + Logo */}
        <div className="flex items-center gap-3">
          {/* Burger only on mobile */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen((p) => !p)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
          </button>

          <Link to="/" className="flex items-center">
            <img src="/src/assets/logo.png" alt="logo" className="h-10 object-contain" />
          </Link>
        </div>

        {/* CENTER: Menu (tablet/desktop) */}
        <div className="hidden md:flex gap-6 lg:gap-8 text-sm font-medium">
          <Link to="/" className="hover:text-blue-400">Home</Link>
          <Link to="/all-books" className="hover:text-blue-400">Books</Link>
          <Link to="/blog" className="hover:text-blue-400">Blog</Link>
          <Link to="/contact" className="hover:text-blue-400">Contact</Link>
        </div>

        {/* RIGHT: Icons (mobile like app) */}
        <div className="flex items-center gap-4 md:gap-5 relative">
          {/* SEARCH ICON */}
          <button
            onClick={() => setSearchOpen((p) => !p)}
            className="p-2"
            aria-label="Search"
          >
            <FaSearch size={18} />
          </button>

          {/* HEART (always same color) */}
          <div className="relative">
            <button
              onClick={onHeartClick}
              className="p-2 text-white" // всегда одинаковый цвет
              aria-label="Favourites"
            >
              <FaHeart size={18} />
              {isLoggedIn && favouritesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] rounded-full px-1 leading-4">
                  {favouritesCount}
                </span>
              )}
            </button>

            {/* If 0 favourites: show message dropdown (like profile) */}
            {favouritesOpen && isLoggedIn && favouritesCount === 0 && (
              <div className="absolute right-0 mt-2 w-52 bg-zinc-700 rounded shadow-lg overflow-hidden">
                <div className="px-4 py-3 text-sm text-zinc-200">
                  No favourite books
                </div>
              </div>
            )}
          </div>

          {/* PROFILE */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen((p) => !p)}
              className="flex items-center gap-2 p-2"
              aria-label="Profile"
            >
              <FaUserCircle size={22} />
              {/* username only on tablet/desktop to keep mobile clean */}
              {isLoggedIn && (
                <span className="hidden md:inline text-sm">{user?.name}</span>
              )}
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-zinc-700 rounded shadow-lg overflow-hidden">
                {!isLoggedIn ? (
                  <button
                    onClick={() => navigate("/login")}
                    className="w-full px-4 py-2 text-left hover:bg-zinc-600"
                  >
                    Log in
                  </button>
                ) : (
                  <>
                    <Link to="/profile" className="block px-4 py-2 hover:bg-zinc-600">
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left hover:bg-zinc-600 text-red-300"
                    >
                      Logout
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* SLIDE-OUT SEARCH PANEL
              - mobile: opens to LEFT (covers towards left)
              - desktop: opens to RIGHT (covers heart area visually because it expands from right side)
          */}
          <div
            className={`
              absolute top-1/2 -translate-y-1/2
              ${/* mobile: anchor to right and expand LEFT */""}
              right-0 md:right-auto
              ${/* desktop: anchor to right of icons */""}
              md:left-auto md:right-0
              transition-all duration-300
              ${searchOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
            `}
          >
            <form
              onSubmit={handleSearchSubmit}
              className={`
                flex items-center gap-2 bg-zinc-700 rounded-full shadow-lg px-3 py-2
                ${/* widths: mobile smaller, tablet medium, desktop bigger */""}
                w-[240px] md:w-[320px] lg:w-[380px]
              `}
            >
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search books..."
                className="w-full bg-transparent outline-none text-sm text-white placeholder:text-zinc-300"
              />
              <button type="submit" className="hover:text-blue-400">
                <FaSearch size={16} />
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="text-zinc-300 hover:text-white"
                aria-label="Close search"
              >
                <FaTimes size={14} />
              </button>
            </form>
          </div>
        </div>

        {/* MOBILE MENU DRAWER (under navbar) */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute left-0 top-[75px] w-full bg-zinc-800/95 backdrop-blur-sm border-t border-zinc-700">
            <div className="px-6 py-4 flex flex-col gap-4 text-sm">
              <Link to="/" className="hover:text-blue-400">Home</Link>
              <Link to="/all-books" className="hover:text-blue-400">Books</Link>
              <Link to="/blog" className="hover:text-blue-400">Blog</Link>
              <Link to="/contact" className="hover:text-blue-400">Contact</Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
