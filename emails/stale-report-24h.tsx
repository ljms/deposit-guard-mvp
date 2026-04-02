import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";

type StaleReport24hEmailProps = {
  propertyAddress: string;
  reportLink: string;
  hoursRemaining: number;
};

export function StaleReport24hEmail({ propertyAddress, reportLink }: StaleReport24hEmailProps) {
  const paragraphStyle: React.CSSProperties = {
    fontSize: 14,
    color: "#4a4a4a",
    lineHeight: 1.65,
    margin: "0 0 16px",
  };

  return (
    <EmailLayout preview="Your report will be permanently deleted tomorrow">
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
        Your report will be deleted tomorrow
      </Heading>
      <Text style={paragraphStyle}>
        Your incomplete report for the property below will be permanently deleted tomorrow. Complete your
        report now to keep it.
      </Text>
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
        To keep this report, please return and finish it before the deletion deadline.
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
    </EmailLayout>
  );
}
