import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import ComponentCard from "@components/common/ComponentCard";
import ResponsiveImage from "@components/ui/images/ResponsiveImage";
import TwoColumnImageGrid from "@components/ui/images/TwoColumnImageGrid";
import ThreeColumnImageGrid from "@components/ui/images/ThreeColumnImageGrid";
import PageMeta from "@components/common/PageMeta";

export default function Images() {
  return (
    <AppLayout>
      <PageMeta
        title="Images | TailAdmin - Next.js Admin Dashboard"
        description="Images page for TailAdmin - Next.js Tailwind CSS Admin Dashboard"
      />
      <PageBreadcrumb pageTitle="Images" />
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title="Responsive image">
          <ResponsiveImage />
        </ComponentCard>
        <ComponentCard title="Image in 2 Grid">
          <TwoColumnImageGrid />
        </ComponentCard>
        <ComponentCard title="Image in 3 Grid">
          <ThreeColumnImageGrid />
        </ComponentCard>
      </div>
    </AppLayout>
  );
}
