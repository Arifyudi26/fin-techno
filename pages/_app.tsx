import type { AppProps } from "next/app";
import "../styles/globals.css";
import "sweetalert2/dist/sweetalert2.min.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
