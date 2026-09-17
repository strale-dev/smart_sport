import type { ReactNode } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { AI_DISCLAIMER, BRAND } from "@/lib/marketing/copy";

export type EmailLayoutProps = {
  preview: string;
  title: string;
  children: ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
};

export function EmailLayout({
  preview,
  title,
  children,
  ctaHref,
  ctaLabel,
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={brand}>{BRAND.name}</Heading>
            <Text style={tagline}>{BRAND.tagline}</Text>
          </Section>

          <Heading style={heading}>{title}</Heading>

          {children}

          {ctaHref && ctaLabel ? (
            <Section style={buttonSection}>
              <Button href={ctaHref} style={button}>
                {ctaLabel}
              </Button>
            </Section>
          ) : null}

          <Hr style={hr} />

          <Text style={footer}>{AI_DISCLAIMER}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#0A0B0F",
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "32px 24px",
  maxWidth: "560px",
};

const header = {
  marginBottom: "24px",
};

const brand = {
  color: "#00E5A0",
  fontSize: "28px",
  fontWeight: "700",
  margin: "0 0 4px",
};

const tagline = {
  color: "#8B94A8",
  fontSize: "14px",
  margin: "0",
};

const heading = {
  color: "#F5F7FA",
  fontSize: "22px",
  fontWeight: "600",
  margin: "0 0 16px",
};

export const emailParagraph = {
  color: "#8B94A8",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const buttonSection = {
  margin: "24px 0",
};

const button = {
  backgroundColor: "#00E5A0",
  borderRadius: "8px",
  color: "#0A0B0F",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: "600",
  padding: "12px 24px",
  textDecoration: "none",
};

const hr = {
  borderColor: "#1F2330",
  margin: "24px 0",
};

const footer = {
  color: "#4A5266",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0",
};
