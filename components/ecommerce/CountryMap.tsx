import dynamic from "next/dynamic";

const CountryMapClient = dynamic(() => import("./CountryMapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full w-full">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
    </div>
  ),
});

export default function CountryMap() {
  return <CountryMapClient />;
}
