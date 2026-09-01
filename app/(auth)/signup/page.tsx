import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/SignupForm";
import { safeReturnTo } from "@/lib/auth/return-to";

export const metadata: Metadata = {
  title: "Sign up",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;

  return <SignupForm returnTo={safeReturnTo(params.returnTo)} />;
}
