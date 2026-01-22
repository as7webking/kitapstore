import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authActions } from "../store/auth";
import { useDispatch } from "react-redux";
import axios from "axios";

const Login = () => {
  const [Values, setValues] = useState({
    username: "",
    password: "",
  });
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const change = (e) => {
    const { name, value } = e.target;
    setValues({ ...Values, [name]: value });
  };
  const submit = async (e) => {
    e.preventDefault();
    try {
      if (Values.username === "" || Values.password === "") {
        return alert("All fields are required");
      } else {
        const response = await axios.post(
          "http://localhost:1001/api/v1/sign-in",
          Values
        );

        dispatch(authActions.login());
        dispatch(authActions.changeRole(response.data.role));
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("id", response.data.id);
        localStorage.setItem("role", response.data.role);
        navigate("/profile");
      }
    } catch (error) {
      alert(error.response.data.message);
    }
  };

  return (
    <div className="h-auto bg-zinc-700 px-12 py-8 flex items-center justify-center">
      <div className="bg-gray-700 rounded-lg px-8 py-5 w-full md:2-3/6 lg:w-2/6">
        <p className="text-zinc-100 text-xl">Login</p>
        <div className="mt-4">
          <div>
            <label htmlFor="" className="text-zinc-400">
              Username
            </label>
            <input
              type="text"
              className="w-full mt-2 bg-zinc-700 text-zinc-100 p-2 outline-none"
              placeholder="username"
              name="username"
              required
              value={Values.username}
              onChange={change}
            />
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="" className="text-zinc-400">
            Password
          </label>
          <input
            type="password"
            className="w-full mt-2 bg-zinc-700 text-zinc-100 p-2 outline-none"
            placeholder="password"
            name="password"
            required
            value={Values.password}
            onChange={change}
          />
        </div>
        <div className="mt-4">
          <button
            className="w-full bg-blue-400 text-white font-semibold py-2 rounded hover:bg-blue-700 transition-all duration-200"
            onClick={submit}
          >
            Log In
          </button>
        </div>
        <p className="flex mt-4 items-center justify-center text-zinc-200 font-semibold">
          Or
        </p>
        <p className="flex mt-4 items-center justify-center text-zinc-400 font-semibold">
          Don't have an account? &nbsp;
          <Link to="/signup" className="hover:text-blue-400">
            <u>Sign up</u>
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
