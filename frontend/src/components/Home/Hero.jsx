import heroImage from '../../assets/hero.png';
import { t } from '../../i18n/index.js';
import React from "react";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <div
      className="hero-section h-screen bg-center bg-cover bg-no-repeat relative"
      style={{ backgroundImage: `url(${heroImage})` }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 h-full flex items-center justify-center">
        <div className="text-center px-6 max-w-[900px]">
          <h1 className="text-4xl lg:text-6xl font-semibold text-white">{t("home:discover_your_next_read")}</h1>

          <p className="mt-4 text-xl text-gray-200">{t("home:uncover_captivating_stories_enriching_knowledge_and_endless_inspiration_in_our_c")}</p>

          <div className="mt-8">
            <Link
              to="/all-books"
              className="inline-block text-white text-xl font-semibold border border-white px-10 py-3 hover:bg-white hover:text-black transition rounded-full"
            >{t("home:discover_books")}</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
