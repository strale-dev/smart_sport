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

// TODO(Phase 7): Implement double opt-in — confirmation link in WaitlistConfirmationEmail
// must be clicked before email is marked confirmed and before any marketing list send.
// Required before waitlist blast / launch announcement (ROADMAP Phase 7).

export type WaitlistConfirmationEmailProps = {
  siteUrl: string;
};

export function WaitlistConfirmationEmail({
  siteUrl,
}: WaitlistConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You&apos;re on the Kivora waitlist</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={brand}>Kivora</Heading>
            <Text style={tagline}>The Game, Decoded.</Text>
          </Section>

          <Heading style={heading}>You&apos;re on the waitlist</Heading>

          <Text style={paragraph}>
            Thanks for signing up. Kivora combines real football data,
            statistical modeling, and AI explanations to help you understand
            every match — not just the scoreline.
          </Text>

          <Text style={paragraph}>
            We&apos;ll email you when early access opens. No spam, no betting
            odds — just football intelligence.
          </Text>

          <Section style={buttonSection}>
            <Button href={siteUrl} style={button}>
              Visit Kivora
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Kivora predictions are AI-generated statistical estimates based on
            historical and live football data. They are not guaranteed outcomes
            and should be treated as analytical insights.
          </Text>
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

const paragraph = {
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

export default WaitlistConfirmationEmail;
