import AppLayout from "@components/layout/AppLayout";
import PageBreadcrumb from "@components/common/PageBreadCrumb";
import ComponentCard from "@components/common/ComponentCard";
import Badge from "@components/ui/badge/Badge";
import { PlusIcon } from "@components/icons";
import PageMeta from "@components/common/PageMeta";

export default function Badges() {
  return (
    <AppLayout>
      <PageMeta
        title="Badges | TailAdmin - Next.js Admin Dashboard"
        description="Badges page for TailAdmin - Next.js Tailwind CSS Admin Dashboard"
      />
      <PageBreadcrumb pageTitle="Badges" />
      <div className="space-y-5 sm:space-y-6">
        <ComponentCard title="With Light Background">
          <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
            <Badge variant="light" color="primary">Primary</Badge>
            <Badge variant="light" color="success">Success</Badge>
            <Badge variant="light" color="error">Error</Badge>
            <Badge variant="light" color="warning">Warning</Badge>
            <Badge variant="light" color="info">Info</Badge>
            <Badge variant="light" color="light">Light</Badge>
            <Badge variant="light" color="dark">Dark</Badge>
          </div>
        </ComponentCard>
        <ComponentCard title="With Solid Background">
          <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
            <Badge variant="solid" color="primary">Primary</Badge>
            <Badge variant="solid" color="success">Success</Badge>
            <Badge variant="solid" color="error">Error</Badge>
            <Badge variant="solid" color="warning">Warning</Badge>
            <Badge variant="solid" color="info">Info</Badge>
            <Badge variant="solid" color="light">Light</Badge>
            <Badge variant="solid" color="dark">Dark</Badge>
          </div>
        </ComponentCard>
        <ComponentCard title="Light Background with Left Icon">
          <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
            <Badge variant="light" color="primary" startIcon={<PlusIcon />}>Primary</Badge>
            <Badge variant="light" color="success" startIcon={<PlusIcon />}>Success</Badge>
            <Badge variant="light" color="error" startIcon={<PlusIcon />}>Error</Badge>
            <Badge variant="light" color="warning" startIcon={<PlusIcon />}>Warning</Badge>
            <Badge variant="light" color="info" startIcon={<PlusIcon />}>Info</Badge>
            <Badge variant="light" color="light" startIcon={<PlusIcon />}>Light</Badge>
            <Badge variant="light" color="dark" startIcon={<PlusIcon />}>Dark</Badge>
          </div>
        </ComponentCard>
        <ComponentCard title="Solid Background with Right Icon">
          <div className="flex flex-wrap gap-4 sm:items-center sm:justify-center">
            <Badge variant="solid" color="primary" endIcon={<PlusIcon />}>Primary</Badge>
            <Badge variant="solid" color="success" endIcon={<PlusIcon />}>Success</Badge>
            <Badge variant="solid" color="error" endIcon={<PlusIcon />}>Error</Badge>
            <Badge variant="solid" color="warning" endIcon={<PlusIcon />}>Warning</Badge>
            <Badge variant="solid" color="info" endIcon={<PlusIcon />}>Info</Badge>
            <Badge variant="solid" color="light" endIcon={<PlusIcon />}>Light</Badge>
            <Badge variant="solid" color="dark" endIcon={<PlusIcon />}>Dark</Badge>
          </div>
        </ComponentCard>
      </div>
    </AppLayout>
  );
}
