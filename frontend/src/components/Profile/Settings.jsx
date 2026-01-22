import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "../Loader/Loader";
const Settings = () => {
  const [Value, setValue] = useState({ address: "" });
  const [ProfileData, setProfileData] = useState();
  const headers = {
    id: localStorage.getItem("id"),
    authorization: `Bearer ${localStorage.getItem("token")}`,
  };
  const change = (e) => {
    const { name, value } = e.target;
    setValue({ ...Value, [name]: value });
  };
  useEffect(() => {
    const fetch = async () => {
      const response = await axios.get(
        "http://localhost:1001/api/v1/get-user-information",
        { headers }
      );
      setProfileData(response.data.data);
      setValue({ address: response.data.address });
    };
    fetch();
  }, []);
  const submitAddress = async () => {
    const response = await axios.put(
      "http://localhost:1001/api/v1/get-user-information",
      Value,
      { headers }
    );
    alert(response.data.message);
  };
  return (
    <>
      {!ProfileData && (
        <div className="w-full h-[100%] flex items-center justify-center">
          <Loader />
        </div>
      )}
      {ProfileData && (
        <div className="">
          <div className="mt-4">
            <label htmlFor="">Address</label>
            <textarea
              className="p-2 rounded bg-zinc-700 mt-2 font-semibold"
              rows="5"
              placeholder="Address"
              name="address"
              value={Value.address}
              onChange={change}
            ></textarea>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              className="bg-yellow-400 text-zinc-700 font-semibold px-3 py-2 rounded hover:bg-yellow-200"
              onClick={submitAddress}
            >
              Update
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Settings;
