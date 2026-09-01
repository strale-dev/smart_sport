import type { Metadata } from "next";

import { CookieConsentShell } from "@/components/marketing/CookieConsentShell";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { BRAND, landingCopy } from "@/lib/marketing/copy";
import { env } from "@/lib/env.server";
import { getCurrentUser, toAuthUserView } from "@/lib/supabase/user";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s — ${BRAND.name}`,
  },
  description: landingCopy.hero.subheadline,
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: env.NEXT_PUBLIC_SITE_URL,
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: landingCopy.hero.subheadline,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: landingCopy.hero.subheadline,
  },
};

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-full flex-col">
      <MarketingHeader user={user ? toAuthUserView(user) : null} />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
      <CookieConsentShell />
    </div>
  );
}
