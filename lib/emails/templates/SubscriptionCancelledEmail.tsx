import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

import { BRAND } from "@/lib/marketing/copy";

export type SubscriptionCancelledEmailProps = {
  siteUrl: string;
};

export function SubscriptionCancelledEmail({
  siteUrl,
}: SubscriptionCancelledEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your {BRAND.name} Premium subscription was cancelled</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Subscription cancelled</Heading>
          <Text style={paragraph}>
            Your {BRAND.name} Premium subscription will not renew. Premium
            features end when your current billing period or trial ends. Your
            follows, favorites, and profile data stay saved.
          </Text>
          <Text style={paragraph}>
            You can resubscribe anytime: {siteUrl.replace(/\/$/, "")}/pricing
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
