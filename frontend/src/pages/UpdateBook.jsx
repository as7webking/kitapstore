import { t, translateMessage } from '../i18n/index.js';
import { API_BASE_URL } from "../config/api.js";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
const UpdateBook = () => {
  const [Data, setData] = useState({
    url: "",
    title: "",
    author: "",
    price: "",
    desc: "",
    language: "",
  });

  const { id } = useParams();
  const navigate = useNavigate();
  const headers = {
    id: localStorage.getItem("id"),
    bookid: id,
    authorization: `Bearer ${localStorage.getItem("token")}`,
  };
  const change = (e) => {
    const { name, value } = e.target;
    setData({ ...Data, [name]: value });
  };
  const submit = async () => {
    try {
      if (
        Data.url === "" ||
        Data.title === "" ||
        Data.author === "" ||
        Data.price === "" ||
        Data.desc === "" ||
        Data.language === ""
      ) {
        alert(t("catalog:all_fields_are_required"));
      } else {
        const response = await axios.put(
          `${API_BASE_URL}/api/v1/update-book`,
          Data,
          { headers }
        );
        setData({
          url: "",
          title: "",
          author: "",
          price: "",
          desc: "",
          language: "",
        });
        alert(translateMessage(response.data));
        navigate(`/view-book-details/${Data.slug || id}`);
      }
    } catch (error) {
      alert(translateMessage(error.response.data));
    }
  };
  useEffect(() => {
    const fetch = async () => {
      const response = await axios.get(
        `${API_BASE_URL}/api/v1/get-book-by-id/${id}`
      );
      setData(response.data.data);
    };
    fetch();
  }, []);
  return (
    <div className="bg-zinc-700 h-[100%] p-0 md:p-4">
      <h1 className="text-3xl md:text-5xl font-semibold text-zinc-400 mb-8">{t("catalog:update_book")}</h1>
      <div className="p-4 bg-zinc-700 rounded">
        <div>
          <label htmlFor="" className="text-zinc-400">{t("catalog:image")}</label>
          <input
            type="text"
            className="w-full mt-2 bg-zinc-700 text-zinc-100 p-2 outline-none"
            placeholder={t("catalog:url_of_image")}
            name="url"
            required
            value={Data.url}
            onChange={change}
          />
        </div>
        <div className="mt-4">
          <label htmlFor="" className="text-zinc-400">{t("catalog:title_of_book")}</label>
          <input
            type="text"
            className="w-full mt-2 bg-zinc-700 text-zinc-100 p-2 outline-none"
            placeholder={t("catalog:title_of_book_2")}
            name="title"
            required
            value={Data.title}
            onChange={change}
          />
        </div>
        <div className="mt-4">
          <label htmlFor="" className="text-zinc-400">{t("catalog:author")}</label>
          <input
            type="text"
            className="w-full mt-2 bg-zinc-700 text-zinc-100 p-2 outline-none"
            placeholder={t("catalog:author_of_book")}
            name="author"
            required
            value={Data.author}
            onChange={change}
          />
        </div>
        <div className="mt-4 flex gap-4">
          <div className="w-3/6">
            <label htmlFor="" className="text-zinc-400">{t("catalog:language")}</label>
            <input
              type="text"
              className="w-full mt-2 bg-zinc-700 text-zinc-100 p-2 outline-none"
              placeholder={t("catalog:language_of_book")}
              name="language"
              required
              value={Data.language}
              onChange={change}
            />
          </div>
          <div className="w-3/6">
            <label htmlFor="" className="text-zinc-400">{t("catalog:price")}</label>
            <input
              type="number"
              className="w-full mt-2 bg-zinc-700 text-zinc-100 p-2 outline-none"
              placeholder={t("catalog:price_of_book")}
              name="price"
              required
              value={Data.price}
              onChange={change}
            />
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="" className="text-zinc-400">{t("catalog:description_of_book")}</label>
          <textarea
            className="w-full mt-2 bg-zinc-700 text-zinc-100 p-2 outline-none"
            rows="5"
            placeholder={t("catalog:author_of_book")}
            name="desc"
            required
            value={Data.desc}
            onChange={change}
          />
        </div>

        <button
          className="w-full bg-blue-400 text-white font-semibold py-2 rounded hover:bg-blue-700 transition-all duration-200"
          onClick={submit}
        >{t("catalog:update_book")}</button>
      </div>
    </div>
  );
};

export default UpdateBook;
