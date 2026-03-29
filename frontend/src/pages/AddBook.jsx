import React, { useState } from "react";
import axios from "axios";

const AddBook = () => {
  const [Data, setData] = useState({
    url: "",
    title: "",
    author: "",
    price: "",
    desc: "",
    language: "",
    slug: "",
    type: "physical",
    pdf: "",
    shippingPrice: "",
  });

  const headers = {
    id: localStorage.getItem("id"),
    authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  // Convert file to base64
  const convertToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await convertToBase64(file);
    setData({ ...Data, url: base64 });
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== "application/pdf") {
      alert("Only PDF files allowed");
      return;
    }
    const base64 = await convertToBase64(file);
    setData({ ...Data, pdf: base64 });
  };

  const change = (e) => {
    const { name, value } = e.target;
    setData({ ...Data, [name]: value });
  };

  const submit = async () => {
    if (!Data.title || !Data.author || !Data.price) {
      return alert("Required fields missing");
    }

    if (Data.type === "digital" && !Data.pdf) {
      return alert("PDF is required for digital books");
    }

    if (Data.type === "physical" && !Data.shippingPrice) {
      return alert("Shipping price required for physical books");
    }

    try {
      const response = await axios.post(
        "http://localhost:1001/api/v1/add-book",
        Data,
        { headers },
      );

      alert(response.data.message);
      setData({
        url: "",
        title: "",
        author: "",
        price: "",
        desc: "",
        language: "",
        slug: "",
        type: "physical",
        pdf: "",
        shippingPrice: "",
      });
    } catch (error) {
      alert(error.response?.data?.message || "Error occurred");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-zinc-800 rounded top-[100px]">
      <h1 className="text-3xl font-semibold text-zinc-300 mb-6">Add Book</h1>

      {/* Book Type */}
      <label className="text-zinc-400">Book Type</label>
      <select
        name="type"
        value={Data.type}
        onChange={change}
        className="w-full mt-2 p-2 bg-zinc-700 text-zinc-100"
      >
        <option value="physical">Physical Book</option>
        <option value="digital">Digital (PDF)</option>
      </select>

      {/* Image */}
      <label className="text-zinc-400 mt-4 block">Cover Image</label>
      <input type="file" accept="image/*" onChange={handleImageUpload} />

      {/* PDF */}
      {Data.type === "digital" && (
        <>
          <label className="text-zinc-400 mt-4 block">Upload PDF</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={handlePdfUpload}
          />
        </>
      )}

      {/* Shipping */}
      {Data.type === "physical" && (
        <>
          <label className="text-zinc-400 mt-4 block">Shipping Price (€)</label>
          <input
            type="number"
            name="shippingPrice"
            value={Data.shippingPrice}
            onChange={change}
            className="w-full p-2 bg-zinc-700 text-zinc-100"
          />
        </>
      )}

      {/* Common Fields */}
      {["title", "author", "language", "price"].map((field) => (
        <input
          key={field}
          name={field}
          value={Data[field]}
          onChange={change}
          placeholder={field}
          className="w-full mt-4 p-2 bg-zinc-700 text-zinc-100"
        />
      ))}

      <textarea
        name="desc"
        value={Data.desc}
        onChange={change}
        placeholder="Description"
        className="w-full mt-4 p-2 bg-zinc-700 text-zinc-100"
      />

      <button
        onClick={submit}
        className="w-full mt-6 bg-blue-500 hover:bg-blue-600 py-2 rounded text-white"
      >
        Add Book
      </button>
    </div>
  );
};

export default AddBook;
