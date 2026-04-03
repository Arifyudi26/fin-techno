import { useEffect } from "react";
import { useRouter } from "next/router";

export function ScrollToTop() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    }
  }, [router.pathname]);

  return null;
}
