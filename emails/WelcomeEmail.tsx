import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";

export type WelcomeEmailProps = {
  userName?: string;
};

const PREVIEW_TEXT = "Start documenting your property to protect your deposit";

export default function WelcomeEmail({ userName }: WelcomeEmailProps) {
  const trimmed = userName?.trim();
  const heading =
    trimmed && trimmed.length > 0
      ? `Welcome to Deposit Guard, ${trimmed}`
      : "Welcome to Deposit Guard";

  const paragraphStyle: React.CSSProperties = {
    fontSize: 14,
    color: "#4a4a4a",
    lineHeight: 1.65,
    margin: "0 0 16px",
  };

  return (
    <EmailLayout preview={PREVIEW_TEXT}>
      <Heading
        as="h1"
        style={{
          fontSize: 20,
          fontWeight: 600,
          color: "#1a1a86",
          margin: "0 0 12px",
          lineHeight: 1.3,
        }}
      >
        {heading}
      </Heading>
      <Text style={paragraphStyle}>
        You&apos;re all set. Start documenting your property&apos;s condition to protect your
        deposit.
      </Text>
      <Text style={{ ...paragraphStyle, marginBottom: 24 }}>
        The sooner you create your check-in report after moving in, the stronger your evidence will
        be if there&apos;s ever a dispute.</Text>
      <Text style={{ ...paragraphStyle, marginBottom: 24 }}>You can also use Deposit Guard to create condition reports
        before you move out, or if there are any issues with the property during your tenancy, such as
        damage that needs to be repaired.
      </Text>
      <Section style={{ textAlign: "left" }}>
        <Button
          href="https://app.depositguard.com/dashboard"
          style={{
            background: "#008bff",
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 600,
            padding: "12px 28px",
            borderRadius: 6,
            textDecoration: "none",
            display: "inline-block",
            lineHeight: 1.25,
            WebkitTextFillColor: "#ffffff",
          }}
        >
          <span style={{ color: "#ffffff", WebkitTextFillColor: "#ffffff", lineHeight: 1.25 }}>
            Get Started
          </span>
        </Button>
      </Section>
    </EmailLayout>
  );
}
