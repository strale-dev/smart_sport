import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { BRAND } from "@/lib/marketing/copy";

export type PaymentSuccessEmailProps = {
  siteUrl: string;
};

export function PaymentSuccessEmail({ siteUrl }: PaymentSuccessEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your {BRAND.name} Premium payment was successful</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Payment received</Heading>
          <Text style={paragraph}>
            Thanks — your {BRAND.name} Premium subscription is active. You now
            have unlimited AI match intelligence within fair-use limits.
          </Text>
          <Text style={paragraph}>
            Manage billing anytime from your account:{" "}
            {siteUrl.replace(/\/$/, "")}/profile/subscription
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#0A0B0F",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "32px 16px",
  maxWidth: "560px",
};

const heading = {
  color: "#F5F7FA",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "1.3",
};

const paragraph = {
  color: "#8B94A8",
  fontSize: "15px",
  lineHeight: "1.6",
};
