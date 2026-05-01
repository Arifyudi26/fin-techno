import { useI18n } from "@lib/i18n";

export default function SidebarWidget() {
  const { t } = useI18n();
  return (
    <div className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 text-center dark:bg-white/[0.03]">
      <h3 className="mb-2 font-semibold text-gray-900 dark:text-white text-theme-sm">
        Fin-Techno
      </h3>
      <p className="mb-4 text-gray-500 text-theme-xs dark:text-gray-400">
        {t.common.sidebarTagline}
      </p>
    </div>
  );
}
