import {
  Body,
  Container,
  Font,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

const POPPINS_WOFF2_400 =
  "https://fonts.gstatic.com/s/poppins/v24/pxiEyp8kv8JHgFVrJJfecg.woff2";
const POPPINS_WOFF2_600 =
  "https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2";

type EmailLayoutProps = {
  children: React.ReactNode;
  preview?: string;
};

export function EmailLayout({ children, preview }: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Poppins"
          fallbackFontFamily="Arial"
          webFont={{ url: POPPINS_WOFF2_400, format: "woff2" }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Poppins"
          fallbackFontFamily="Arial"
          webFont={{ url: POPPINS_WOFF2_600, format: "woff2" }}
          fontWeight={600}
          fontStyle="normal"
        />
      </Head>
      {preview ? <Preview>{preview}</Preview> : null}
      <Body
        style={{
          backgroundColor: "#f3f4f6",
          fontFamily: "'Poppins', Arial, sans-serif",
          padding: "32px 16px",
          margin: 0,
        }}
      >
        <Container style={{ maxWidth: 520, margin: "0 auto" }}>
          <Section style={{ marginBottom: 20, textAlign: "center" }}>
            <Img
              src="https://app.depositguard.com/dg-logo-dark.png"
              alt="Deposit Guard"
              height={56}
              style={{ margin: "0 auto" }}
            />
          </Section>
          <Section
            style={{
              background: "#ffffff",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              overflow: "hidden",
            }}
          >
            <Section
              style={{
                height: 4,
                background: "linear-gradient(90deg, #1a1a86 0%, #008bff 100%)",
                lineHeight: 0,
              }}
            >
              &nbsp;
            </Section>
            <Section style={{ padding: 28 }}>{children}</Section>
          </Section>
          <Section style={{ paddingTop: 16, textAlign: "center" }}>
            <Text
              style={{
                margin: "0 0 8px",
                fontSize: 11,
                color: "#888888",
                lineHeight: 1.5,
              }}
            >
              Deposit Guard Ltd · 55 St Paul's Street, Leeds, LS1 2TE
            </Text>
            <Link
              href="https://depositguard.com/privacy"
              style={{ color: "#008bff", fontSize: 11, textDecoration: "none" }}
            >
              Privacy policy
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
