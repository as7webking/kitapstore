import { useState } from "react";
import axios from "axios";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:1001/api/contact", form);
      setStatus("Message sent ✅");
      setForm({ name: "", email: "", message: "" });
    } catch {
      setStatus("Error ❌");
    }
  };

  return (
    <div className="min-h-screen flex items-center">
      {/* CONTAINER */}
      <div className="w-[90%] max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* LEFT */}
          <div className="space-y-4">
            <h1 className="text-3xl font-bold mb-6">Contact</h1>

            <p>📍 Berlin, Alexanderplatz 1</p>
            <p>📞 +49 123 456789</p>
            <p>🕒 Mo–Sa 10:00–19:00</p>

            <iframe
              className="w-full h-64 rounded-xl border"
              src="https://www.google.com/maps?q=Alexanderplatz+Berlin&output=embed"
              loading="lazy"
            />
          </div>

          {/* RIGHT */}
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-xl shadow space-y-4"
          >
            <input
              className="w-full border rounded-lg p-3"
              name="name"
              placeholder="Name"
              value={form.name}
              onChange={handleChange}
              required
            />

            <input
              className="w-full border rounded-lg p-3"
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
            />

            <textarea
              className="w-full border rounded-lg p-3"
              name="message"
              rows="5"
              placeholder="Message"
              value={form.message}
              onChange={handleChange}
              required
            />

            <button className="w-full bg-black text-white py-3 rounded-lg hover:opacity-90">
              Send
            </button>

            {status && <p className="text-sm">{status}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
