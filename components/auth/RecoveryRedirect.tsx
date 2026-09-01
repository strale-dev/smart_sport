"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { UPDATE_PASSWORD_PATH } from "@/lib/auth/recovery";

export function RecoveryRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (
      pathname === UPDATE_PASSWORD_PATH ||
      pathname.startsWith(`${UPDATE_PASSWORD_PATH}/`)
    ) {
      return;
    }

    const hash = window.location.hash.slice(1);
    if (!hash) {
      return;
    }

    const params = new URLSearchParams(hash);
    if (params.get("type") === "recovery") {
      router.replace(`${UPDATE_PASSWORD_PATH}${window.location.hash}`);
    }
  }, [pathname, router]);

  return null;
}
