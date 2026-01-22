import React from "react";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <div className="h-[75vh] flex flex-col md:flex-row items-center justify-center">
      <div className="w-full mb-12 md:mb-0 lg:w-3/6 flex flex-col items-center lg:items-start justify-center">
        <h1 className="text-4xl lg:text-6xl font-semibold text-black text-center lg:text-left">
          Discover your next read
        </h1>
        <p className="mt-4 text-xl text-gray-700 text-center lg:text-left">
          Uncover captivating stories, enriching knowledge, and endless
          inspiration in our curated collection of books
        </p>
        <div className="mt-8">
          <Link to="/all-books" className="text-gray-500 text-xl lg:text-2xl font-semibold border border-gray-700 px-10 py-3 hover:bg-gray-100 rounded-full">
            Discover Books
          </Link>
        </div>
      </div>
      <div className="w-full lg:w-3/6 h-auto lg:h-[100%] flex items-center justify-center ">
      <img src="./src/assets/hero.png" alt="hero" />
      </div>
    </div>
  );
};

export default Hero;
