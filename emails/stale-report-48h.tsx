import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

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
  return (
    <Html>
      <Head />
      <Preview>Your report will be deleted in 48 hours</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={headerBand}>
            <Text style={logoText}>Deposit Guard</Text>
          </Section>
          <Section style={content}>
            <Text style={heading}>Reminder: complete your report</Text>
            <Text style={paragraph}>
              You have an incomplete, unpaid report for:
            </Text>
            <Text style={addressText}>{propertyAddress}</Text>
            <Text style={paragraph}>
              Incomplete unpaid reports are automatically deleted after 7 days.
              This report will be deleted in {hoursRemaining} hours unless you
              complete it.
            </Text>
            <Button href={reportLink} style={cta}>
              Complete Your Report
            </Button>
            <Text style={paragraph}>
              If you no longer need this report, no action is required.
            </Text>
            <Hr style={divider} />
            <Text style={footerBrand}>Deposit Guard</Text>
            <Text style={footerNote}>
              You&apos;re receiving this because you have an incomplete report
              on Deposit Guard.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  margin: 0,
  padding: "24px 0",
  backgroundColor: "#f3f4f6",
  fontFamily:
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
};

const container = {
  maxWidth: "600px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  overflow: "hidden",
};

const headerBand = {
  backgroundColor: "#1a1a86",
  padding: "18px 24px",
};

const logoText = {
  margin: 0,
  color: "#ffffff",
  fontWeight: "700",
  fontSize: "22px",
  lineHeight: "1.2",
};

const content = {
  padding: "24px",
  color: "#111827",
};

const heading = {
  margin: "0 0 12px",
  fontSize: "22px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#111827",
};

const paragraph = {
  margin: "0 0 14px",
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#111827",
};

const addressText = {
  margin: "0 0 14px",
  fontSize: "16px",
  lineHeight: "1.4",
  color: "#111827",
  fontWeight: "700",
};

const cta = {
  display: "inline-block",
  margin: "6px 0 16px",
  padding: "12px 18px",
  borderRadius: "6px",
  backgroundColor: "#008bff",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "15px",
  fontWeight: "600",
};

const divider = {
  margin: "20px 0 12px",
  borderColor: "#e5e7eb",
};

const footerBrand = {
  margin: "0 0 4px",
  fontSize: "13px",
  lineHeight: "1.4",
  color: "#6b7280",
  fontWeight: "600",
};

const footerNote = {
  margin: 0,
  fontSize: "12px",
  lineHeight: "1.5",
  color: "#6b7280",
};
