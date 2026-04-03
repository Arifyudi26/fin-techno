import PageMeta from "@components/common/PageMeta";
import AuthLayout from "@components/auth/AuthLayout";
import SignInForm from "@components/auth/SignInForm";

export default function Login() {
  return (
    <>
      <PageMeta
        title="Sign In | MyFinance"
        description="Sign in to your MyFinance account"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
