import { t } from '../../i18n/index.js';
import React from "react";

const features = [
  {
    title: "home:curated_selection",
    text: "home:we_carefully_select_books_to_bring_you_quality_content_across_various_genres"
  },
  {
    title: "home:easy_access",
    text: "home:browse_discover_and_enjoy_books_with_a_clean_and_intuitive_experience"
  },
  {
    title: "home:growing_library",
    text: "home:new_books_are_added_regularly_so_you_always_find_something_fresh"
  }
];

const About = () => {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto max-w-[1200px] px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">{t("home:why_choose_our_library")}</h2>
          <p className="text-gray-600 text-lg">{t("home:a_modern_platform_designed_for_readers_who_value_quality_simplicity_and_inspirat")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((item, index) => (
            <div
              key={index}
              className="p-8 border border-gray-200 rounded-2xl text-center hover:shadow-md transition"
            >
              <h3 className="text-xl font-medium mb-3">{t(item.title)}</h3>
              <p className="text-gray-600">{t(item.text)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
    
  );
};

export default About;
