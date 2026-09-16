import axios from "axios";

const getApiBase = () => {
  if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes("localhost")) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== "undefined" && window.location.hostname.includes("cafecorazon.shop")) {
    return "https://api.cafecorazon.shop/api";
  }
  return import.meta.env.VITE_API_URL || "http://localhost:5000/api";
};

const API_BASE = getApiBase();

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
