import type { AppProps } from "next/app";
import "../styles/globals.css";
import { ThemeProvider } from "@lib/context/ThemeContext";
import { SessionProvider } from "next-auth/react";
import { NotificationProvider } from "@lib/context/NotificationContext";
import { ModalProvider } from "@lib/context/ModalContext";
import { DocsLangProvider } from "@lib/docs/LangContext";

export default function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider>
        <DocsLangProvider>
          <NotificationProvider>
            <ModalProvider>
              <Component {...pageProps} />
            </ModalProvider>
          </NotificationProvider>
        </DocsLangProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
