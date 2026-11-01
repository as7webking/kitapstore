import { t, translateMessage } from '../i18n/index.js';
import { API_BASE_URL } from "../config/api.js";
import React, { useState } from "react";
import axios from "axios";

const AddBlog = () => {
  const [data, setData] = useState({
    coverImage: "",
    title: "",
    slug: "",
    content: "",
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
      return alert(t("blog:title_and_content_are_required"));
    }

    const payload = {
      ...data,
      slug: data.slug ? generateSlug(data.slug) : generateSlug(data.title),
    };

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/blog/add-blog`,
        payload,
        { headers }
      );

      alert(translateMessage(response.data.message));

      setData({
        coverImage: "",
        title: "",
        slug: "",
        content: "",
      });
    } catch (error) {
      alert(translateMessage(error.response?.data?.message || "blog:error_occurred"));
    }
  };

  return (
    <div className="h-[100%] p-0 md:p-4">
      <h1 className="text-3xl md:text-5xl font-semibold text-zinc-400 mb-8">{t("blog:add_blog")}</h1>

      <div className="p-4 bg-zinc-700 rounded">
        <div className="mt-4">
          <label className="text-zinc-400">{t("blog:cover_image")}</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="w-full mt-2 text-zinc-100"
          />
        </div>

        <div className="mt-4">
          <label className="text-zinc-400">{t("blog:title")}</label>
          <input
            type="text"
            name="title"
            value={data.title}
            onChange={change}
            className="w-full mt-2 bg-zinc-800 text-zinc-100 p-2 outline-none"
            placeholder={t("blog:blog_title")}
          />
        </div>

        <div className="mt-4">
          <label className="text-zinc-400">{t("blog:slug_optional")}</label>
          <input
            type="text"
            name="slug"
            value={data.slug}
            onChange={change}
            className="w-full mt-2 bg-zinc-800 text-zinc-100 p-2 outline-none"
            placeholder={t("blog:custom_blog_link")}
          />
        </div>

        <div className="mt-4">
          <label className="text-zinc-400">{t("blog:content")}</label>
          <textarea
            name="content"
            value={data.content}
            onChange={change}
            className="w-full mt-2 bg-zinc-800 text-zinc-100 p-2 outline-none"
            rows="10"
            placeholder={t("blog:write_blog_content_here")}
          />
        </div>

        <button
          onClick={submit}
          className="w-full bg-blue-400 text-white font-semibold py-2 rounded hover:bg-blue-700 transition-all duration-200 mt-6"
        >{t("blog:add_blog")}</button>
      </div>
    </div>
  );
};

export default AddBlog;