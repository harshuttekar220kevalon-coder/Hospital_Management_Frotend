export const API_BASE_URL = "http://127.0.0.1:8000/api";

export const extractArray = (resData) => {
  if (!resData) return [];
  if (Array.isArray(resData)) return resData;
  if (Array.isArray(resData.results)) return resData.results;
  if (Array.isArray(resData.data)) return resData.data;
  if (Array.isArray(resData.appointments)) return resData.appointments;
  if (Array.isArray(resData.patients)) return resData.patients;
  if (Array.isArray(resData.doctors)) return resData.doctors;
  if (Array.isArray(resData.nurses)) return resData.nurses;
  if (Array.isArray(resData.hospitals)) return resData.hospitals;
  if (Array.isArray(resData.rows)) return resData.rows;
  return [];
};

export const fetchWorkingEndpoint = async (endpoints, options = {}) => {
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, options);
      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        const data = extractArray(json);
        if (Array.isArray(data)) return data;
      }
    } catch (e) {}
  }
  return [];
};

export default API_BASE_URL;
