import { t } from '../../i18n/index.js';
import React from "react";

const testimonials = [
  {
    name: "Anna K.",
    text: "home:this_platform_helped_me_discover_books_i_would_have_never_found_on_my_own",
  },
  {
    name: "Michael R.",
    text: "home:clean_design_great_selection_and_very_easy_to_use_highly_recommended",
  },
  {
    name: "Sophia L.",
    text: "home:i_love_how_simple_and_inspiring_the_experience_feels",
  },
];

const Testimonials = () => {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto max-w-[1200px] px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">{t("home:what_readers_say")}</h2>
          <p className="text-gray-600 text-lg">{t("home:feedback_from_people_who_love_reading_with_us")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((item, index) => (
            <div
              key={index}
              className="p-8 border border-gray-200 rounded-2xl hover:shadow-md transition"
            >
              <p className="text-gray-700 mb-6">
                “{t(item.text)}”
              </p>
              <span className="font-medium">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
