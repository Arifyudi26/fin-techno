/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import GridShape from "@components/common/GridShape";
import PageMeta from "@components/common/PageMeta";
import { useI18n } from "@lib/i18n";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <>
      <PageMeta
        title="404 Not Found | Fin-Techno"
        description="Page not found"
      />
      <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden bg-white dark:bg-gray-900">
        <GridShape />
        <div className="mx-auto w-full max-w-[242px] text-center sm:max-w-[472px]">
          <h1 className="mb-8 font-bold text-gray-800 text-title-md dark:text-white/90 xl:text-title-2xl">
            {t.common.errorTitle}
          </h1>
          <img
            src="/images/error/404.svg"
            alt="404"
            width={472}
            height={300}
            className="dark:hidden"
          />
          <img
            src="/images/error/404-dark.svg"
            alt="404"
            width={472}
            height={300}
            className="hidden dark:block"
          />
          <p className="mt-10 mb-6 text-base text-gray-700 dark:text-gray-400 sm:text-lg">
            {t.common.pageNotFound}
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
          >
            {t.common.backToDashboard}
          </Link>
        </div>
        <p className="absolute text-sm text-center text-gray-500 -translate-x-1/2 bottom-6 left-1/2 dark:text-gray-400">
          &copy; {new Date().getFullYear()} - Fin-Techno
        </p>
      </div>
    </>
  );
}
