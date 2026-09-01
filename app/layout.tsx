import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toast";
import { BRAND } from "@/lib/marketing/copy";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: BRAND.name,
    template: `%s — ${BRAND.name}`,
  },
  description: BRAND.tagline,
  icons: {
    icon: "/brand/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={cn(
        "dark min-h-dvh w-full antialiased",
        inter.variable,
        jetbrainsMono.variable,
        spaceGrotesk.variable
      )}
    >
      <body
        className="flex min-h-dvh w-full max-w-full flex-col overflow-x-clip"
        suppressHydrationWarning
      >
        <AppProviders>{children}</AppProviders>
        <Toaster />
      </body>
    </html>
  );
}
