import React from "react";

const features = [
  {
    title: "Curated Selection",
    text: "We carefully select books to bring you quality content across various genres."
  },
  {
    title: "Easy Access",
    text: "Browse, discover, and enjoy books with a clean and intuitive experience."
  },
  {
    title: "Growing Library",
    text: "New books are added regularly so you always find something fresh."
  }
];

const About = () => {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto max-w-[1200px] px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            Why Choose Our Library
          </h2>
          <p className="text-gray-600 text-lg">
            A modern platform designed for readers who value quality, simplicity,
            and inspiration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((item, index) => (
            <div
              key={index}
              className="p-8 border border-gray-200 rounded-2xl text-center hover:shadow-md transition"
            >
              <h3 className="text-xl font-medium mb-3">{item.title}</h3>
              <p className="text-gray-600">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
    
  );
};

export default About;
