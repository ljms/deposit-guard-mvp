import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";

type StaleReport48hEmailProps = {
  propertyAddress: string;
  reportLink: string;
  hoursRemaining: number;
};

export function StaleReport48hEmail({
  propertyAddress,
  reportLink,
  hoursRemaining,
}: StaleReport48hEmailProps) {
  const paragraphStyle: React.CSSProperties = {
    fontSize: 14,
    color: "#4a4a4a",
    lineHeight: 1.65,
    margin: "0 0 16px",
  };

  return (
    <EmailLayout preview="Your report will be deleted in 48 hours">
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
        Complete your report
      </Heading>
      <Text style={paragraphStyle}>You have an incomplete report for the property below.</Text>
      <Section
        style={{
          background: "#f9fafb",
          borderRadius: 8,
          padding: 16,
          border: "1px solid #f0f0f0",
          marginTop: 20,
          marginBottom: 24,
        }}
      >
        <Text style={{ fontSize: 14, color: "#4a4a4a", fontWeight: 600, margin: 0 }}>{propertyAddress}</Text>
      </Section>
      <Text style={paragraphStyle}>
        Incomplete reports are automatically deleted after 7 days. This report will be deleted in{" "}
        {hoursRemaining} hours unless you complete it.
      </Text>
      <Section style={{ textAlign: "left" }}>
        <Button
          href={reportLink}
          style={{
            background: "#008bff",
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 600,
            padding: "12px 28px",
            borderRadius: 6,
            textDecoration: "none",
            lineHeight: 1.25,
            display: "inline-block",
          }}
        >
          Complete Your Report
        </Button>
      </Section>
      <Text style={{ ...paragraphStyle, marginBottom: 0 }}>
        If you no longer need this report, no action is required.
      </Text>
    </EmailLayout>
  );
}
