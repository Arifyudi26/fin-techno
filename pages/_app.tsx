import type { AppProps } from "next/app";
import "../styles/globals.css";
import { ThemeProvider } from "@lib/context/ThemeContext";
import { SessionProvider } from "next-auth/react";
import { NotificationProvider } from "@lib/context/NotificationContext";
import { ModalProvider } from "@lib/context/ModalContext";
import { DocsLangProvider } from "@lib/docs/LangContext";
import { I18nProvider } from "@lib/i18n";
import { useEffect, useState } from "react";
import useAuthStore from "@/store/authStore";

export default function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useAuthStore.getState()._hasHydrated) {
      setHydrated(true);
      return;
    }
    const unsub = useAuthStore.subscribe((s) => {
      if (s._hasHydrated) {
        setHydrated(true);
        unsub();
      }
    });
    return unsub;
  }, []);

  if (!hydrated) return null;

  return (
    <SessionProvider session={session}>
      <ThemeProvider>
        <I18nProvider>
          <DocsLangProvider>
            <NotificationProvider>
              <ModalProvider>
                <Component {...pageProps} />
              </ModalProvider>
            </NotificationProvider>
          </DocsLangProvider>
        </I18nProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
