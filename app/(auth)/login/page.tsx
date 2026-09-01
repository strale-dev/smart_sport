import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/LoginForm";
import { safeReturnTo } from "@/lib/auth/return-to";

export const metadata: Metadata = {
  title: "Log in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <LoginForm
      returnTo={safeReturnTo(params.returnTo)}
      errorCode={params.error}
    />
  );
}
