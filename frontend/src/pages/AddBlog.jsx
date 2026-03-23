import React, { useState } from "react";
import axios from "axios";

const AddBlog = () => {
  const [data, setData] = useState({
    coverImage: "",
    title: "",
    slug: "",
    author: "",
    excerpt: "",
    content: "",
    status: "draft",
  });

  const headers = {
    id: localStorage.getItem("id"),
    authorization: `Bearer ${localStorage.getItem("token")}`,
  };

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
    setData({ ...data, coverImage: base64 });
  };

  const change = (e) => {
    const { name, value } = e.target;
    setData({ ...data, [name]: value });
  };

  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const submit = async () => {
    if (!data.title || !data.content) {
      return alert("Title and content are required");
    }

    const payload = {
      ...data,
      slug: data.slug ? generateSlug(data.slug) : generateSlug(data.title),
    };

    try {
      const response = await axios.post(
        "http://localhost:1001/api/v1/blog/add-blog",
        payload,
        { headers }
      );

      alert(response.data.message);

      setData({
        coverImage: "",
        title: "",
        slug: "",
        author: "",
        excerpt: "",
        content: "",
        status: "draft",
      });
    } catch (error) {
      alert(error.response?.data?.message || "Error occurred");
    }
  };

  return (
    <div className="h-[100%] p-0 md:p-4">
      <h1 className="text-3xl md:text-5xl font-semibold text-zinc-400 mb-8">
        Add Blog
      </h1>

      <div className="p-4 bg-zinc-700 rounded">
        <label className="text-zinc-400">Cover Image</label>

        <div className="mt-4">
          <label className="text-zinc-400">Title</label>
          <input
            type="text"
            name="title"
            value={data.title}
            onChange={change}
            className="w-full mt-2 bg-zinc-800 text-zinc-100 p-2 outline-none"
            placeholder="Blog title"
          />
        </div>

        <div className="mt-4">
          <label className="text-zinc-400">Slug (optional)</label>
          <input
            type="text"
            name="slug"
            value={data.slug}
            onChange={change}
            className="w-full mt-2 bg-zinc-800 text-zinc-100 p-2 outline-none"
            placeholder="custom-blog-link"
          />
        </div>

        {/* <div className="mt-4">
          <label className="text-zinc-400">Author</label>
          <input
            type="text"
            name="author"
            value={data.author}
            onChange={change}
            className="w-full mt-2 bg-zinc-800 text-zinc-100 p-2 outline-none"
            placeholder="Author name"
          />
        </div> */}

        <div className="mt-4">
          <label className="text-zinc-400">Content</label>
          <textarea
            name="content"
            value={data.content}
            onChange={change}
            className="w-full mt-2 bg-zinc-800 text-zinc-100 p-2 outline-none"
            rows="10"
            placeholder="Write blog content here"
          />
        </div>

        {/* <div className="mt-4">
          <label className="text-zinc-400">Status</label>
          <select
            name="status"
            value={data.status}
            onChange={change}
            className="w-full mt-2 bg-zinc-800 text-zinc-100 p-2 outline-none"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div> */}

        <button
          onClick={submit}
          className="w-full bg-blue-400 text-white font-semibold py-2 rounded hover:bg-blue-700 transition-all duration-200 mt-6"
        >
          Add Blog
        </button>
      </div>
    </div>
  );
};

export default AddBlog;