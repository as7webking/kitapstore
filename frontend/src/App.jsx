import RouteErrorBoundary from './errors/ErrorBoundary.jsx';
import FailureState from './errors/FailureState.jsx';
import { useTranslation } from 'react-i18next';
import React, { lazy, Suspense, useEffect } from "react";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import { Routes, Route } from "react-router-dom";
import { startSessionLifecycle } from "./auth/session.js";
import RequireAuth from "./auth/RequireAuth.jsx";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

const Home = lazy(() => import("./pages/Home"));
const AllBooks = lazy(() => import("./pages/AllBooks"));
const AddBook = lazy(() => import("./pages/AddBook"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SignUp = lazy(() => import("./pages/SignUp"));
const Cart = lazy(() => import("./pages/Cart"));
const Profile = lazy(() => import("./pages/Profile"));
const ViewBookDetails = lazy(() => import("./components/ViewBookDetails/ViewBookDetails"));
const Favourites = lazy(() => import("./components/Profile/Favourites"));
const UserOrderHistory = lazy(() => import("./components/Profile/UserOrderHistory"));
const Settings = lazy(() => import("./components/Profile/Settings"));
const AllOrders = lazy(() => import("./pages/AllOrders"));
const UpdateBook = lazy(() => import("./pages/UpdateBook"));
const Popular = lazy(() => import("./components/Home/Popular"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogDetails = lazy(() => import("./pages/BlogDetails"));
const AddBlog = lazy(() => import("./pages/AddBlog"));
const Contact = lazy(() => import("./pages/Contact"));
const SearchResults = lazy(() => import("./pages/SearchResults"));

const App = () => {
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const role = useSelector((state) => state.auth.role);
  useEffect(startSessionLifecycle, []);
  return (
    <div lang={i18n.language === 'qt' ? 'crh-Latn' : i18n.resolvedLanguage || 'en'} className=" min-h-screen flex flex-col">
      <Navbar />
      <div
        className={`flex-grow ${location.pathname !== "/" ? "pt-[75px]" : ""}`}
      >
        <RouteErrorBoundary>
        <Suspense fallback={<div role="status" className="py-16 text-center">{t("common:loading")}</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/all-books" element={<AllBooks />} />
          <Route path="/popular-books" element={<Popular />} />
          <Route element={<RequireAuth />}><Route path="/cart" element={<Cart />} /></Route>
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogDetails />} />
          <Route element={<RequireAuth />}>
          <Route path="/profile" element={<Profile />}>
            {role === "user" ? (
              <Route index element={<Favourites />} />
            ) : (
              <Route index element={<AllOrders />} />
            )}
            <Route element={<RequireAuth admin />}>
              <Route path="add-book" element={<AddBook />} />
              <Route path="add-blog" element={<AddBlog />} />
              <Route path="update-book/:id" element={<UpdateBook />} />
            </Route>
            <Route path="orderHistory" element={<UserOrderHistory />} />
            <Route path="/profile/favourites" element={<Favourites />} />
            <Route path="/profile/order-history" element={<UserOrderHistory />} />
            <Route path="/profile/settings" element={<Settings />} />
          </Route>
          </Route>
          <Route element={<RequireAuth admin />}><Route path="/update-book/:id" element={<UpdateBook />} /></Route>
          <Route path="/search" element={<SearchResults />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/contact" element={<Contact />} />
          <Route
            path="/view-book-details/:slug"
            element={<ViewBookDetails />}
          />
          <Route path="*" element={<FailureState kind="not_found" />} />
        </Routes>
        </Suspense>
        </RouteErrorBoundary>
      </div>
      <Footer />
    </div>
  );
};

export default App;
