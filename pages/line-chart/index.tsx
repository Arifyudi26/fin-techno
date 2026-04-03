import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import ComponentCard from "@components/common/ComponentCard";
import LineChartOne from "@components/charts/line/LineChartOne";
import PageMeta from "@components/common/PageMeta";

export default function LineChart() {
  return (
    <AppLayout>
      <PageMeta
        title="Line Chart | TailAdmin - Next.js Admin Dashboard"
        description="Line Chart page for TailAdmin - Next.js Tailwind CSS Admin Dashboard"
      />
      <PageBreadcrumb pageTitle="Line Chart" />
      <div className="space-y-6">
        <ComponentCard title="Line Chart 1">
          <LineChartOne />
        </ComponentCard>
      </div>
    </AppLayout>
  );
}
