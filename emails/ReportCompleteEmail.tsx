import { Button, Column, Heading, Row, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";

const PREVIEW_TEXT = "Your condition report is ready to download";

export type ReportCompleteEmailProps = {
  userName?: string;
  propertyAddress: string;
  roomCount: number;
  photoCount: number;
  generatedDate: string;
  reportUrl: string;
  pdfUrl: string;
};

export default function ReportCompleteEmail({
  userName,
  propertyAddress,
  roomCount,
  photoCount,
  generatedDate,
  reportUrl,
  pdfUrl,
}: ReportCompleteEmailProps) {
  const trimmedName = userName?.trim();
  const lead = trimmedName
    ? `Great news, ${trimmedName}. Your condition report has been generated and is ready to download.`
    : "Great news. Your condition report has been generated and is ready to download.";

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
        Your report is ready
      </Heading>
      <Text style={{ ...paragraphStyle, margin: "0 0 16px" }}>{lead}</Text>
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
        <Text style={{ fontSize: 13, color: "#4a4a4a", fontWeight: 600, margin: "0 0 6px" }}>
          Property: {propertyAddress}
        </Text>
        <Text style={{ fontSize: 13, color: "#4a4a4a", margin: "0 0 6px" }}>Rooms: {roomCount}</Text>
        <Text style={{ fontSize: 13, color: "#4a4a4a", margin: "0 0 6px" }}>Photos: {photoCount}</Text>
        <Text style={{ fontSize: 13, color: "#888888", margin: 0 }}>Generated: {generatedDate}</Text>
      </Section>
      <Text style={paragraphStyle}>
        Your report is now locked and can&apos;t be edited. This is what makes it credible evidence —
        it proves nothing has been tampered with after the fact.
      </Text>
      <Row style={{ marginTop: 8 }}>
        <Column style={{ width: "auto", verticalAlign: "middle", paddingRight: 12 }}>
          <Button
            href={reportUrl}
            style={{
              background: "#008bff",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 600,
              padding: "12px 28px",
              borderRadius: 6,
              textDecoration: "none",
              lineHeight: 1.25,
            }}
          >
            View report
          </Button>
        </Column>
        <Column style={{ width: "auto", verticalAlign: "middle" }}>
          <Button
            href={pdfUrl}
            style={{
              background: "transparent",
              color: "#008bff",
              fontSize: 14,
              fontWeight: 600,
              padding: "12px 28px",
              borderRadius: 6,
              textDecoration: "none",
              border: "1px solid #008bff",
              lineHeight: 1.25,
              boxSizing: "border-box",
            }}
          >
            Download PDF
          </Button>
        </Column>
      </Row>
    </EmailLayout>
  );
}
