import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import ComponentCard from "@components/common/ComponentCard";
import BarChartOne from "@components/charts/bar/BarChartOne";
import PageMeta from "@components/common/PageMeta";

export default function BarChart() {
  return (
    <AppLayout>
      <PageMeta
        title="Bar Chart | TailAdmin - Next.js Admin Dashboard"
        description="Bar Chart page for TailAdmin - Next.js Tailwind CSS Admin Dashboard"
      />
      <PageBreadcrumb pageTitle="Bar Chart" />
      <div className="space-y-6">
        <ComponentCard title="Bar Chart 1">
          <BarChartOne />
        </ComponentCard>
      </div>
    </AppLayout>
  );
}
