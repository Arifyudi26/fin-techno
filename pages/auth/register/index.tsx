import PageMeta from "@components/common/PageMeta";
import AuthLayout from "@components/auth/AuthLayout";
import SignUpForm from "@components/auth/SignUpForm";

export default function Register() {
  return (
    <>
      <PageMeta
        title="Sign Up | Fin-Techno"
        description="Create your Fin-Techno account"
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
