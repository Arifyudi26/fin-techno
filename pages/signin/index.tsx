import PageMeta from "@components/common/PageMeta";
import AuthLayout from "@components/auth/AuthLayout";
import SignInForm from "@components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Sign In | TailAdmin - Next.js Admin Dashboard"
        description="Sign In page for TailAdmin - Next.js Tailwind CSS Admin Dashboard"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
