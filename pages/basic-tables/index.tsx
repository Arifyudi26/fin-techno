import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import ComponentCard from "@components/common/ComponentCard";
import PageMeta from "@components/common/PageMeta";
import BasicTableOne from "@components/tables/BasicTables/BasicTableOne";

export default function BasicTables() {
  return (
    <AppLayout>
      <PageMeta
        title="Basic Tables | TailAdmin - Next.js Admin Dashboard"
        description="Basic Tables page for TailAdmin - Next.js Tailwind CSS Admin Dashboard"
      />
      <PageBreadcrumb pageTitle="Basic Tables" />
      <div className="space-y-6">
        <ComponentCard title="Basic Table 1">
          <BasicTableOne />
        </ComponentCard>
      </div>
    </AppLayout>
  );
}
