import React from "react";
import Hero from "../components/Home/Hero";
import RecentlyAdded from "../components/Home/RecentlyAdded";
import Popular from "../components/Home/Popular";
import Testimonials from "../components/Home/Testimonials";
import About from "../components/Home/About";

const Home = () => {
  return (
    <div className="bg-white text-gray-700">
      <Hero />
      <About />
      <RecentlyAdded />
      <Popular />
      <Testimonials />
    </div>
  );
};

export default Home;
