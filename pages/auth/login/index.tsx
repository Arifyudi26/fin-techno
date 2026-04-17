import PageMeta from "@components/common/PageMeta";
import AuthLayout from "@components/auth/AuthLayout";
import SignInForm from "@components/auth/SignInForm";

export default function Login() {
  return (
    <>
      <PageMeta
        title="Sign In | Fin-Techno"
        description="Sign in to your Fin-Techno account"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
