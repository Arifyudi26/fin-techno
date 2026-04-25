import DocLayout from "@/components/docs/DocLayout";
import { SectionTitle, SubTitle, FlowStep } from "@/components/docs/shared";
import { useI18n } from "@lib/i18n";

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 ${className}`}>
    {children}
  </div>
);

export default function DocsFlow() {
  const { t } = useI18n();
  const tr = t.docs;

  return (
    <DocLayout title={tr.flowTitle}>
      <SectionTitle>{tr.flowTitle}</SectionTitle>
      <p className="text-gray-600 mb-6 dark:text-gray-400">{tr.flowDesc}</p>

      {tr.flowSections.map((section) => (
        <div key={section.subtitle}>
          <SubTitle>{section.subtitle}</SubTitle>
          {section.cards.map((card, ci) => (
            <Card key={ci} className={ci < section.cards.length - 1 ? "mb-4" : "mb-6"}>
              {card.label && (
                <p className="text-sm font-semibold text-gray-700 mb-3 dark:text-gray-200">{card.label}</p>
              )}
              {card.steps.map((step, si) => (
                <FlowStep key={si} num={si + 1} title={step.title} desc={step.desc} />
              ))}
            </Card>
          ))}
        </div>
      ))}

      <SubTitle>{tr.middlewareTitle}</SubTitle>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold text-gray-700 mb-2 dark:text-gray-200">{tr.publicPages}</p>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              {["/auth/login", "/auth/register", "/auth/change-password", "/auth/oauth-callback", "/docs"].map((p) => (
                <li key={p}>
                  <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-700 dark:text-gray-300">{p}</code>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-2 dark:text-gray-200">{tr.publicApis}</p>
            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
              {["/api/auth/login", "/api/auth/register", "/api/auth/send-otp", "/api/auth/verify-otp", "/api/auth/callback/*"].map((p) => (
                <li key={p}>
                  <code className="bg-gray-100 px-1 rounded text-xs dark:bg-gray-700 dark:text-gray-300">{p}</code>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
          {tr.middlewareNote}{" "}
          <code className="dark:text-gray-400">token</code>
          {tr.middlewareNote2}{" "}
          <code className="dark:text-gray-400">Authorization: Bearer &lt;token&gt;</code>.
        </p>
      </Card>
    </DocLayout>
  );
}
