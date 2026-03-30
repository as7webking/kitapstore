import React, { useEffect } from "react";
import Home from "./pages/Home";
import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import { Routes, Route } from "react-router-dom";
import AllBooks from "./pages/AllBooks";
import AddBook from "./pages/AddBook";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Cart from "./pages/Cart";
import Profile from "./pages/Profile";
import ViewBookDetails from "./components/ViewBookDetails/ViewBookDetails";
import { authActions } from "./store/auth";
import { useDispatch, useSelector } from "react-redux";
import Favourites from "./components/Profile/Favourites";
import UserOrderHistory from "./components/Profile/UserOrderHistory";
import Settings from "./components/Profile/Settings";
import AllOrders from "./pages/AllOrders";
import UpdateBook from "./pages/UpdateBook";
import RecentlyAdded from "./components/Home/RecentlyAdded";
import Popular from "./components/Home/Popular";
import Blog from "./pages/Blog";
import BlogDetails from "./pages/BlogDetails";
import AddBlog from "./pages/AddBlog";
import Contact from "./pages/Contact";
import SearchResults from "./pages/SearchResults";
import { useLocation } from "react-router-dom";

const App = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const role = useSelector((state) => state.auth.role);
  useEffect(() => {
    if (
      localStorage.getItem("id") &&
      localStorage.getItem("token") &&
      localStorage.getItem("role")
    ) {
      dispatch(authActions.login());
      dispatch(authActions.changeRole(localStorage.getItem("role")));
    }
  }, [dispatch]);
  return (
    <div className=" min-h-screen flex flex-col">
      <Navbar />
      <div
        className={`flex-grow ${location.pathname !== "/" ? "pt-[75px]" : ""}`}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/all-books" element={<AllBooks />} />
          <Route path="/popular-books" element={<Popular />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogDetails />} />
          <Route path="/profile" element={<Profile />}>
        <Route path="/search" element={<SearchResults />} /> ̰
            {role === "user" ? (
              <Route index element={<Favourites />} />
            ) : (
              <Route index element={<AllOrders />} />
            )}
            {role === "admin" && (
              <>
                <Route path="add-book" element={<AddBook />} />
                <Route path="add-blog" element={<AddBlog />} />
                <Route path="update-book/:id" element={<UpdateBook />} />
              </>
            )}
            <Route path="orderHistory" element={<UserOrderHistory />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/contact" element={<Contact />} />
          <Route
            path="/view-book-details/:slug"
            element={<ViewBookDetails />}
          />
        </Routes>
      </div>
      <Footer />
    </div>
  );
};

export default App;
