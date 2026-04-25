import DocLayout from "@/components/docs/DocLayout";
import { Code, SectionTitle, SubTitle } from "@/components/docs/shared";
import { useI18n } from "@lib/i18n";

export default function DocsOverview() {
  const { t } = useI18n();
  const tr = t.docs;

  return (
    <DocLayout title={tr.overviewTitle}>
      <SectionTitle>{tr.overviewTitle}</SectionTitle>
      <p className="text-gray-600 mb-6 leading-relaxed dark:text-gray-400">
        <strong>Fin-Techno</strong> {tr.overviewDesc}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {tr.features.map((f) => (
          <div key={f.title} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="font-semibold text-gray-800 mb-1 dark:text-gray-100">{f.title}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{f.desc}</p>
          </div>
        ))}
      </div>

      <SubTitle>{tr.techStack}</SubTitle>
      <div className="flex flex-wrap gap-2 mb-6">
        {["Next.js 15", "TypeScript", "PostgreSQL (Neon)", "Prisma ORM", "JWT Auth", "NextAuth v4", "Zustand", "ApexCharts", "FullCalendar", "Tailwind CSS", "Vercel Blob", "QStash"].map((tech) => (
          <span key={tech} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            {tech}
          </span>
        ))}
      </div>

      <SubTitle>{tr.authentication}</SubTitle>
      <p className="text-sm text-gray-600 mb-3 dark:text-gray-400">
        {tr.authDesc}{" "}
        <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-800 dark:text-gray-300">/api/auth/*</code>
        {tr.authDesc2}
      </p>
      <Code>{`Authorization: Bearer <JWT_TOKEN>`}</Code>

      <SubTitle>URL</SubTitle>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-gray-600 font-medium dark:text-gray-300">{tr.environment}</th>
              <th className="px-4 py-2 text-left text-gray-600 font-medium dark:text-gray-300">URL</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100 dark:border-gray-700">
              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">Local</td>
              <td className="px-4 py-2 font-mono text-blue-600 dark:text-blue-400">http://localhost:3000</td>
            </tr>
            <tr className="border-t border-gray-100 dark:border-gray-700">
              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">Production</td>
              <td className="px-4 py-2 font-mono text-blue-600 dark:text-blue-400">https://fin-techno.vercel.app</td>
            </tr>
          </tbody>
        </table>
      </div>
    </DocLayout>
  );
}
