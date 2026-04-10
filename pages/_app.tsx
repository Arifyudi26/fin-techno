import type { AppProps } from "next/app";
import "../styles/globals.css";
import { ThemeProvider } from "@lib/context/ThemeContext";
import { SessionProvider } from "next-auth/react";

export default function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider>
        <Component {...pageProps} />
      </ThemeProvider>
    </SessionProvider>
  );
}
