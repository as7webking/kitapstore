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
  });
  const [errors, setErrors] = useState(false);

  //Using SetData and Data
  const headers = {
    id: localStorage.getItem("id"),
    authorization: `Bearer ${localStorage.getItem("token")}`,
  };

  // Helper function: Convert image file to Base64 string
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = () => {
        resolve(fileReader.result);
      };
      fileReader.onerror = (error) => {
        reject(error);
      };
    });
  };

  // Handle file upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const base64 = await convertToBase64(file);
        // We put the base64 string into the same 'url' field
        setData({ ...Data, url: base64 });
      } catch (error) {
        console.error("Error converting file:", error);
      }
    }
  };

  const change = (e) => {
    const { name, value } = e.target;
    setData({ ...Data, [name]: value });
  };

  //Generate Slug
  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };
  const submit = async () => {
    try {
      if (
        !Data.url ||
        !Data.title ||
        !Data.author ||
        !Data.price ||
        !Data.desc ||
        !Data.language
      ) {
        setErrors(true);
        return alert("All fields are required");
      }

      // Generate slug if empty
      const finalSlug =
        Data.slug.trim() !== ""
          ? generateSlug(Data.slug)
          : generateSlug(Data.title);
      const bookDataWithSlug = { ...Data, slug: finalSlug };

      const response = await axios.post(
        "http://localhost:1001/api/v1/add-book",
        bookDataWithSlug,
        { headers }
      );

      setData({
        url: "",
        title: "",
        author: "",
        price: "",
        desc: "",
        language: "",
        slug: "",
      });
      setErrors(false);
      alert(response.data.message);
    } catch (error) {
      alert(error.response?.data?.message || "Error occurred");
    }
  };

  //Show classes
  const getInputClass = (value) => {
    const baseClass =
      "w-full mt-2 bg-zinc-800 text-zinc-100 p-2 outline-none border transition-all";
    if (errors && value === "") {
      return `${baseClass} border-red-500`;
    }
    return `${baseClass} border-zinc-700 focus:border-blue-400`;
  };

  //HTML View
  return (
    <div className="h-[100%] p-0 md:p-4">
      <h1 className="text-3xl md:text-5xl font-semibold text-zinc-400 mb-8">
        Add Book
      </h1>
      <div className="p-4 bg-zinc-700 rounded">
        {/* IMAGE SECTION */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-zinc-400">Image (URL or Upload File)</label>

            {/* Option 1: URL Input */}
            <input
              type="text"
              className="w-full mt-2 bg-zinc-800 text-zinc-100 p-2 outline-none border border-zinc-700 focus:border-blue-400"
              placeholder="Paste image URL here"
              name="url"
              value={
                Data.url.startsWith("data:image") ? "File uploaded" : Data.url
              }
              onChange={change}
            />

            <div className="text-center text-zinc-500 my-2">-- OR --</div>

            {/* Option 2: File Upload */}
            <input
              type="file"
              accept="image/*"
              className="w-full text-zinc-100 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-400 hover:file:bg-zinc-900 cursor-pointer"
              onChange={handleFileChange}
            />
          </div>

          {/* Preview of the image */}
          {Data.url && (
            <div className="mt-2">
              <p className="text-zinc-500 text-sm mb-2">Image Preview:</p>
              <img
                src={Data.url}
                alt="Preview"
                className="h-32 rounded border border-zinc-600"
              />
            </div>
          )}
        </div>
        <div className="mt-4">
          <label htmlFor="" className="text-zinc-400">
            Title of book
          </label>
          <input
            type="text"
            className="w-full mt-2 bg-zinc-700 text-zinc-100 p-2 outline-none"
            placeholder="title of book"
            name="title"
            value={Data.title}
            onChange={change}
          />
        </div>
        <div className="mt-4">
          <label htmlFor="" className="text-zinc-400">
            Slug (Link) - Optional
          </label>
          <input
            type="text"
            className="w-full mt-2 bg-zinc-700 text-zinc-100 p-2 outline-none"
            placeholder="leave empty for auto-generate or type custom-link"
            name="slug"
            value={Data.slug}
            onChange={change}
          />
        </div>
        <div className="mt-4">
          <label htmlFor="" className="text-zinc-400">
            Author
          </label>
          <input
            type="text"
            className="w-full mt-2 bg-zinc-700 text-zinc-100 p-2 outline-none"
            placeholder="author of book"
            name="author"
            value={Data.author}
            onChange={change}
          />
        </div>
        <div className="mt-4 flex gap-4">
          <div className="w-3/6">
            <label htmlFor="" className="text-zinc-400">
              Language
            </label>
            <input
              type="text"
              className="w-full mt-2 bg-zinc-700 text-zinc-100 p-2 outline-none"
              placeholder="language of book"
              name="language"
              value={Data.language}
              onChange={change}
            />
          </div>
          <div className="w-3/6">
            <label htmlFor="" className="text-zinc-400">
              Price
            </label>
            <input
              type="number"
              className="w-full mt-2 bg-zinc-700 text-zinc-100 p-2 outline-none"
              placeholder="price of book"
              name="price"
              value={Data.price}
              onChange={change}
            />
          </div>
        </div>
        {/* Description Field */}
        <div className="mt-4">
          <label htmlFor="" className="text-zinc-400">
            Description of book
          </label>
          <textarea
            className="w-full mt-2 bg-zinc-700 text-zinc-100 p-2 outline-none"
            rows="5"
            placeholder="author of book"
            name="desc"
            value={Data.desc}
            onChange={change}
          />
        </div>

        <button
          className="w-full bg-blue-400 text-white font-semibold py-2 rounded hover:bg-blue-700 transition-all duration-200"
          onClick={submit}
        >
          Add Book
        </button>
      </div>
    </div>
  );
};

export default AddBook;
