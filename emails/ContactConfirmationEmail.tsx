import { Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";

const PREVIEW_TEXT = "We've received your message";

export type ContactConfirmationEmailProps = {
  name: string;
  subject: string;
  message: string;
};

export default function ContactConfirmationEmail({
  name,
  subject,
  message,
}: ContactConfirmationEmailProps) {
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
        We&apos;ve received your message
      </Heading>
      <Text
        style={{
          fontSize: 14,
          color: "#4a4a4a",
          lineHeight: 1.65,
          margin: "0 0 16px",
        }}
      >
        Thanks for getting in touch, {name}. We&apos;ve received your message and will get back to you
        as soon as we can.
      </Text>
      <Section
        style={{
          background: "#f9fafb",
          borderRadius: 8,
          padding: 16,
          border: "1px solid #f0f0f0",
          marginTop: 20,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            color: "#4a4a4a",
            fontWeight: 600,
            margin: "0 0 6px",
          }}
        >
          Subject: {subject}
        </Text>
        <Text style={{ fontSize: 13, color: "#888888", margin: "0 0 4px" }}>Message:</Text>
        <Text style={{ fontSize: 13, color: "#4a4a4a", lineHeight: 1.5, margin: 0, whiteSpace: "pre-wrap" }}>
          {message}
        </Text>
      </Section>
    </EmailLayout>
  );
}
