import React from "react";

const testimonials = [
  {
    name: "Anna K.",
    text: "This platform helped me discover books I would have never found on my own.",
  },
  {
    name: "Michael R.",
    text: "Clean design, great selection, and very easy to use. Highly recommended.",
  },
  {
    name: "Sophia L.",
    text: "I love how simple and inspiring the experience feels.",
  },
];

const Testimonials = () => {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto max-w-[1200px] px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">
            What Readers Say
          </h2>
          <p className="text-gray-600 text-lg">
            Feedback from people who love reading with us
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((item, index) => (
            <div
              key={index}
              className="p-8 border border-gray-200 rounded-2xl hover:shadow-md transition"
            >
              <p className="text-gray-700 mb-6">
                “{item.text}”
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
