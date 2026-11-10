import { readResource } from '../../errors/readResource.js';
import FailureState from '../../errors/FailureState.jsx';
import { t, translateMessage } from '../../i18n/index.js';
import { API_BASE_URL } from "../../config/api.js";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Loader from "../Loader/Loader";
const Settings = () => {
  const [Value, setValue] = useState({ address: "" });
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveError, setSaveError] = useState('');
  const [ProfileData, setProfileData] = useState();
  const headers = {
    id: localStorage.getItem("id"),
    authorization: `Bearer ${localStorage.getItem("token")}`,
  };
  const change = (e) => {
    const { name, value } = e.target;
    setValue({ ...Value, [name]: value });
  };
  useEffect(() => readResource(`${API_BASE_URL}/api/v1/user/get-user-information`, false, (result) => {
    if (result.error) { setLoadError(true); return; }
    const profile = result.data.data || result.data;
    setProfileData(profile);
    setValue({ address: profile.address || '' });
    setLoadError(false);
  }), [loadAttempt]);
  const submitAddress = async () => {
    setSaveError('');
    try {
    const response = await axios.put(
      `${API_BASE_URL}/api/v1/user/get-user-information`,
      Value,
      { headers }
    );
    alert(translateMessage(response.data));
    } catch (error) { setSaveError(error.response?.data || 'common:network_error'); }
  };
  if (loadError) return <FailureState onRetry={() => setLoadAttempt((value) => value + 1)} />;
  return (
    <>
      {saveError && <p role="alert">{translateMessage(saveError)}</p>}
      {!ProfileData && (
        <div className="w-full h-[100%] flex items-center justify-center">
          <Loader />
        </div>
      )}
      {ProfileData && (
        <div className="">
          <div className="mt-4">
            <label htmlFor="">{t("profile:address")}</label>
            <textarea
              className="p-2 rounded bg-zinc-700 mt-2 font-semibold"
              rows="5"
              placeholder={t("profile:address")}
              name="address"
              value={Value.address}
              onChange={change}
            ></textarea>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              className="bg-yellow-400 text-zinc-700 font-semibold px-3 py-2 rounded hover:bg-yellow-200"
              onClick={submitAddress}
            >{t("profile:update")}</button>
          </div>
        </div>
      )}
    </>
  );
};

export default Settings;
