import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import ComponentCard from "@components/common/ComponentCard";
import Button from "@components/ui/button/Button";
import { BoxIcon } from "@components/icons";
import PageMeta from "@components/common/PageMeta";

export default function Buttons() {
  return (
    <AppLayout>
      <PageMeta
        title="Buttons | TailAdmin - Next.js Admin Dashboard"
        description="Buttons page for TailAdmin - Next.js Tailwind CSS Admin Dashboard"
      />
      <PageBreadcrumb pageTitle="Buttons" />
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title="Primary Button">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="primary">Button Text</Button>
            <Button size="md" variant="primary">Button Text</Button>
          </div>
        </ComponentCard>
        <ComponentCard title="Primary Button with Left Icon">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="primary" startIcon={<BoxIcon className="size-5" />}>Button Text</Button>
            <Button size="md" variant="primary" startIcon={<BoxIcon className="size-5" />}>Button Text</Button>
          </div>
        </ComponentCard>
        <ComponentCard title="Primary Button with Right Icon">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="primary" endIcon={<BoxIcon className="size-5" />}>Button Text</Button>
            <Button size="md" variant="primary" endIcon={<BoxIcon className="size-5" />}>Button Text</Button>
          </div>
        </ComponentCard>
        <ComponentCard title="Secondary Button">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="outline">Button Text</Button>
            <Button size="md" variant="outline">Button Text</Button>
          </div>
        </ComponentCard>
        <ComponentCard title="Outline Button with Left Icon">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="outline" startIcon={<BoxIcon className="size-5" />}>Button Text</Button>
            <Button size="md" variant="outline" startIcon={<BoxIcon className="size-5" />}>Button Text</Button>
          </div>
        </ComponentCard>
        <ComponentCard title="Outline Button with Right Icon">
          <div className="flex items-center gap-5">
            <Button size="sm" variant="outline" endIcon={<BoxIcon className="size-5" />}>Button Text</Button>
            <Button size="md" variant="outline" endIcon={<BoxIcon className="size-5" />}>Button Text</Button>
          </div>
        </ComponentCard>
      </div>
    </AppLayout>
  );
}
