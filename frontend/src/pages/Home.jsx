import React from "react";
import Hero from "../components/Home/Hero";
import RecentlyAdded from "../components/Home/RecentlyAdded";

const Home = () => {
  return (
    <div className="bg-white text-gray-700  w-[90%] max-w-[1200px] mx-auto px-6 py-8">
      <Hero />
      <RecentlyAdded />
    </div>
  );
};

export default Home;
