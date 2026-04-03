import type { AppProps } from "next/app";
import "../styles/globals.css";
import "sweetalert2/dist/sweetalert2.min.css";
import { ThemeProvider } from "../lib/context/ThemeContext";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
