import logoImage from '../../assets/logo.png';
import LanguageSwitcher from '../../i18n/LanguageSwitcher.jsx';
import { t, formatNumber } from '../../i18n/index.js';
import { API_BASE_URL } from "../../config/api.js";
import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaSearch, FaHeart, FaUserCircle, FaBars, FaTimes } from "react-icons/fa";
import { useSelector } from "react-redux";
import { logout } from "../../auth/session.js";
import axios from "axios";

const Navbar = () => {
  const navigate = useNavigate();
  const triggerRef = useRef(null);
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

  const toggleProfile = (event) => {
    triggerRef.current = event.currentTarget;
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

  const toggleFav = (event) => {
    if (event) triggerRef.current = event.currentTarget;
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

  const toggleSearchDesktop = (event) => {
    triggerRef.current = event.currentTarget;
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

  const toggleMobileMenu = (event) => {
    triggerRef.current = event.currentTarget;
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
    if (!isLoggedIn || user?.role === "admin") return;

    const fetchFavourites = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/v1/favourites/get-favourite-books`,
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
  }, [isLoggedIn, user?.role, user?.id, token]);

  useEffect(() => {
    if (!profileOpen && !favOpen && !searchOpen && !mobileMenuOpen) return;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setProfileOpen(false); setFavOpen(false); setSearchOpen(false); setMobileMenuOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [profileOpen, favOpen, searchOpen, mobileMenuOpen]);

  const favouritesCount = isLoggedIn && user?.role !== "admin" ? favourites.length : 0;

  const handleLogout = async () => {
    try { await logout(); navigate("/login"); }
    catch { alert(t("navigation:could_not_log_out_check_your_connection_and_try_again")); }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setSearchQuery("");
    setSearchOpen(false);
  };

  const onFavClickDesktop = (event) => {
    if (!isLoggedIn || user?.role === "admin" || favouritesCount === 0) {
      toggleFav(event);
      return;
    }
    closeAll();
    navigate("/profile/favourites");
  };

  const onFavClickMobile = (event) => {
    if (!isLoggedIn || user?.role === "admin" || favouritesCount === 0) {
      toggleFav(event);
      return;
    }
    closeAll();
    navigate("/profile/favourites");
  };

  return (
    <nav
      className={`fixed top-0 left-0 w-full h-[75px] text-white z-50 transition-colors duration-300 ${navbarBg} `}
    >
      <div className="max-w-[1200px] h-full mx-auto px-3 sm:px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center shrink-0">
          <img src={logoImage} alt={t("navigation:logo")} className="h-10 object-contain" />
        </Link>

        <div className="hidden lg:flex items-center justify-center gap-8 text-sm font-medium flex-1">
          <Link to="/" onClick={closeAll} className="hover:text-blue-300">{t("navigation:home")}</Link>
          <Link to="/all-books" onClick={closeAll} className="hover:text-blue-300">{t("navigation:books")}</Link>
          <Link to="/blog" onClick={closeAll} className="hover:text-blue-300">{t("navigation:blog")}</Link>
          <Link to="/contact" onClick={closeAll} className="hover:text-blue-300">{t("navigation:contact")}</Link>
        </div>

        <div className="flex items-center justify-center gap-2 sm:gap-4 shrink-0 relative">
          <LanguageSwitcher />
          {/* Desktop / Tablet */}
          <div className="hidden lg:flex items-center gap-4 relative">
            <button
              type="button"
              onClick={toggleSearchDesktop}
              className="text-white inline-flex min-h-9 min-w-9 items-center justify-center"
              aria-label={t("navigation:search")}
              aria-expanded={searchOpen}
            >
              <FaSearch size={18} />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={onFavClickDesktop}
                className="text-white relative inline-flex min-h-9 min-w-9 items-center justify-center"
                aria-label={t("navigation:favourites")}
              >
                <FaHeart size={18} />
                {favouritesCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-xs rounded-full px-1">
                    {formatNumber(favouritesCount)}
                  </span>
                )}
              </button>

              {favOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-zinc-800 rounded shadow-lg px-4 py-3 text-sm text-zinc-200">
                  {user?.role === "admin"
                    ? t("navigation:admins_cannot_use_favourites")
                    : !isLoggedIn
                      ? t("navigation:log_in_to_use_favourites")
                      : favouritesCount === 0
                        ? t("navigation:no_favourite_books")
                        : null}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={toggleProfile}
                className="text-white inline-flex min-h-9 min-w-9 items-center justify-center"
                aria-label={t("navigation:profile")}
                aria-expanded={profileOpen}
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
                    >{t("navigation:log_in")}</button>
                  ) : (
                    <>
                      <Link
                        to="/profile"
                        onClick={closeAll}
                        className="block px-4 py-2 hover:bg-zinc-700"
                      >{t("navigation:profile")}</Link>
                      <button
                        onClick={() => {
                          closeAll();
                          handleLogout();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-zinc-700 text-red-300"
                      >{t("navigation:logout")}</button>
                    </>
                  )}
                </div>
              )}
            </div>

            {searchOpen && <form
              onSubmit={handleSearchSubmit}
              className={`absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 overflow-hidden
              bg-zinc-700 rounded transition-all duration-300
              ${searchOpen ? "w-[420px] px-3 py-2" : "w-0 px-0 py-0"}`}
              style={{ zIndex: 60 }}
            >
              <input
                autoFocus
                aria-label={t("navigation:search_books")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`bg-transparent outline-none text-sm min-w-0 w-full focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  searchOpen ? "opacity-100" : "opacity-0"
                } transition-opacity duration-200`}
                placeholder={t("navigation:search_books")}
              />
              <button
                type="submit"
                className={`${
                  searchOpen ? "opacity-100" : "opacity-0"
                } transition-opacity duration-200`}
                aria-label={t("navigation:submit_search")}
              >
                <FaSearch size={16} />
              </button>
              <button
                type="button"
                onClick={() => { setSearchOpen(false); triggerRef.current?.focus(); }}
                className={`${
                  searchOpen ? "opacity-100" : "opacity-0"
                } transition-opacity duration-200`}
                aria-label={t("navigation:close_search")}
              >
                <FaTimes size={16} />
              </button>
            </form>}
          </div>

          {/* Mobile */}
          <div className="lg:hidden flex items-center gap-2 sm:gap-4 relative">
            <div className="relative flex items-center gap-2 sm:gap-4">
              <button
                type="button"
                onClick={onFavClickMobile}
                className="text-white relative inline-flex min-h-9 min-w-9 items-center justify-center"
                aria-label={t("navigation:favourites")}
              >
                <FaHeart size={18} />
                {favouritesCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-xs rounded-full px-1">
                    {formatNumber(favouritesCount)}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={toggleProfile}
                className="text-white inline-flex min-h-9 min-w-9 items-center justify-center"
                aria-label={t("navigation:profile")}
                aria-expanded={profileOpen}
              >
                <FaUserCircle size={22} />
              </button>

              {favOpen && (
                <div className="fixed right-3 top-[75px] mt-2 w-56 max-w-[calc(100vw-24px)] bg-zinc-800 rounded shadow-lg px-4 py-3 text-sm text-zinc-200">
                  {user?.role === "admin"
                    ? t("navigation:admins_cannot_use_favourites")
                    : !isLoggedIn
                      ? t("navigation:log_in_to_use_favourites")
                      : favouritesCount === 0
                        ? t("navigation:no_favourite_books")
                        : null}
                </div>
              )}

              {profileOpen && (
                <div className="fixed right-3 top-[75px] mt-2 w-48 max-w-[calc(100vw-24px)] bg-zinc-800 rounded shadow-lg overflow-hidden">
                  {!isLoggedIn ? (
                    <button
                      onClick={() => {
                        closeAll();
                        navigate("/login");
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-zinc-700"
                    >{t("navigation:log_in")}</button>
                  ) : (
                    <>
                      <Link
                        to="/profile"
                        onClick={closeAll}
                        className="block px-4 py-2 hover:bg-zinc-700"
                      >{t("navigation:profile")}</Link>
                      <button
                        onClick={() => {
                          closeAll();
                          handleLogout();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-zinc-700 text-red-300"
                      >{t("navigation:logout")}</button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={toggleSearchDesktop}
                className="text-white inline-flex min-h-9 min-w-9 items-center justify-center"
                aria-label={t("navigation:search")}
                aria-expanded={searchOpen}
              >
                <FaSearch size={18} />
              </button>

              {searchOpen && <form
                onSubmit={handleSearchSubmit}
                className={`fixed left-3 right-3 top-[83px] flex items-center gap-2 overflow-hidden
                bg-zinc-800 rounded transition-all duration-300
                ${searchOpen ? "w-auto px-3 py-2" : "w-0 px-0 py-0"}`}
                style={{ zIndex: 60 }}
              >
                <input
                  autoFocus
                  aria-label={t("navigation:search_books")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`bg-transparent outline-none text-sm min-w-0 w-full focus-visible:ring-2 focus-visible:ring-blue-400 ${
                    searchOpen ? "opacity-100" : "opacity-0"
                  } transition-opacity duration-200`}
                  placeholder={t("navigation:search_2")}
                />
                <button
                  type="submit"
                  className={`${
                    searchOpen ? "opacity-100" : "opacity-0"
                  } transition-opacity duration-200`}
                  aria-label={t("navigation:submit_search")}
                >
                  <FaSearch size={16} />
                </button>
                <button type="button" className="min-h-9 min-w-9 inline-flex items-center justify-center"
                  onClick={() => { setSearchOpen(false); triggerRef.current?.focus(); }}
                  aria-label={t("navigation:close_search")}><FaTimes size={16} /></button>
              </form>}
            </div>

            <button
              type="button"
              className="text-white inline-flex min-h-9 min-w-9 items-center justify-center"
              onClick={toggleMobileMenu}
              aria-label={t("navigation:menu")}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              <FaBars size={18} />
            </button>
          </div>
        </div>
      </div>

      <div
        id="mobile-navigation"
        inert={!mobileMenuOpen}
        aria-hidden={!mobileMenuOpen}
        className={`lg:hidden bg-zinc-800 overflow-hidden transition-all duration-300 ${
          mobileMenuOpen ? "max-h-[calc(100dvh-75px)] overflow-y-auto" : "max-h-0"
        }`}
      >
        <div className="px-6 py-4 flex flex-col items-center gap-3 text-sm">
          <Link to="/" onClick={closeAll} className="hover:text-blue-300">{t("navigation:home")}</Link>
          <Link to="/all-books" onClick={closeAll} className="hover:text-blue-300">{t("navigation:books")}</Link>
          <Link to="/blog" onClick={closeAll} className="hover:text-blue-300">{t("navigation:blog")}</Link>
          <Link to="/contact" onClick={closeAll} className="hover:text-blue-300">{t("navigation:contact")}</Link>
        </div>
      </div>
    </nav>
  );
};

const NavbarForRoute = () => {
  const location = useLocation();
  return <Navbar key={location.pathname} />;
};

export default NavbarForRoute;
