import { useI18n, Lang } from "@lib/i18n";

const LANGS: { value: Lang; label: string; flag: string }[] = [
  { value: "id", label: "ID", flag: "🇮🇩" },
  { value: "en", label: "EN", flag: "🇬🇧" },
];

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const next = lang === "id" ? "en" : "id";
  const current = LANGS.find((l) => l.value === lang)!;
  const nextLang = LANGS.find((l) => l.value === next)!;

  return (
    <button
      onClick={() => setLang(next)}
      title={`Switch to ${nextLang.label}`}
      className="relative flex items-center justify-center gap-1.5 text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white text-xs font-semibold"
    >
      <span>{current.flag}</span>
    </button>
  );
}
