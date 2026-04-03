import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import ComponentCard from "@components/common/ComponentCard";
import FourIsToThree from "@components/ui/videos/FourIsToThree";
import OneIsToOne from "@components/ui/videos/OneIsToOne";
import SixteenIsToNine from "@components/ui/videos/SixteenIsToNine";
import TwentyOneIsToNine from "@components/ui/videos/TwentyOneIsToNine";
import PageMeta from "@components/common/PageMeta";

export default function Videos() {
  return (
    <AppLayout>
      <PageMeta
        title="Videos | TailAdmin - Next.js Admin Dashboard"
        description="Videos page for TailAdmin - Next.js Tailwind CSS Admin Dashboard"
      />
      <PageBreadcrumb pageTitle="Videos" />
      <div className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-2">
        <div className="space-y-5 sm:space-y-6">
          <ComponentCard title="Video Ratio 16:9">
            <SixteenIsToNine />
          </ComponentCard>
          <ComponentCard title="Video Ratio 4:3">
            <FourIsToThree />
          </ComponentCard>
        </div>
        <div className="space-y-5 sm:space-y-6">
          <ComponentCard title="Video Ratio 21:9">
            <TwentyOneIsToNine />
          </ComponentCard>
          <ComponentCard title="Video Ratio 1:1">
            <OneIsToOne />
          </ComponentCard>
        </div>
      </div>
    </AppLayout>
  );
}
