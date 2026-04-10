import { useEffect } from "react";
import { useSession } from "next-auth/react";
import Cookies from "js-cookie";
import useAuthStore from "@/store/authStore";

export default function OAuthCallback() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session) {
      const { appToken, appId, appRole, appName } = session;

      if (appToken) {
        // Set cookie dulu agar middleware bisa baca sebelum redirect
        Cookies.set("token", appToken, { expires: 1 });

        useAuthStore.getState().setId(appId as string);
        useAuthStore.getState().setToken(appToken);
        useAuthStore.getState().setRole(appRole as string);
        useAuthStore.getState().setName(appName as string);

        window.location.href = "/";
      }
    } else if (status === "unauthenticated") {
      window.location.href = "/auth/login";
    }
  }, [session, status]);

  return (
    <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
      <p className="text-gray-500 dark:text-gray-400">Signing you in...</p>
    </div>
  );
}
