import { useState, useEffect } from "react";
import axiosGlobal from "@/services/AxiosGlobal";
import useAuthStore from "@/store/authStore";

// Cache object URL di memory (hilang saat refresh, tapi di-fetch ulang otomatis)
let cachedObjectUrl: string | null = null;
let cachedBlobUrl: string | null = null;

export function useAvatarUrl() {
  const { avatar, token } = useAuthStore();
  const [objectUrl, setObjectUrl] = useState<string | null>(cachedObjectUrl);

  useEffect(() => {
    if (!avatar || !token) {
      cachedObjectUrl = null;
      cachedBlobUrl = null;
      setObjectUrl(null);
      return;
    }

    // Sudah di-cache untuk blob URL yang sama
    if (cachedBlobUrl === avatar && cachedObjectUrl) {
      setObjectUrl(cachedObjectUrl);
      return;
    }

    let cancelled = false;
    axiosGlobal
      .get("/user/avatar-url", { responseType: "blob", params: { t: Date.now() } })
      .then((res) => {
        if (cancelled) return;
        if (cachedObjectUrl) URL.revokeObjectURL(cachedObjectUrl);
        const url = URL.createObjectURL(res.data);
        cachedObjectUrl = url;
        cachedBlobUrl = avatar;
        setObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setObjectUrl(null);
      });

    return () => { cancelled = true; };
  }, [avatar, token]);

  return objectUrl;
}

// Panggil ini setelah upload avatar baru agar cache di-refresh
export function invalidateAvatarCache() {
  if (cachedObjectUrl) URL.revokeObjectURL(cachedObjectUrl);
  cachedObjectUrl = null;
  cachedBlobUrl = null;
}
