import axios from "axios";
import useAuthStore from "@/store/authStore";

const axiosGlobal = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosGlobal.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Kirim preferensi bahasa ke server agar pesan API ikut diterjemahkan.
    // Sinkron dengan STORAGE_KEY "app-lang" di lib/i18n.
    if (typeof window !== "undefined") {
      const lang = localStorage.getItem("app-lang");
      config.headers["x-app-lang"] = lang === "en" ? "en" : "id";
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosGlobal.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosGlobal;
