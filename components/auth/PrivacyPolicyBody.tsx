"use client";

const fontStyle = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };

/**
 * Privacy Policy text from Deposit Guard (Last Modified: March 29, 2026).
 * Pagination lines from the source PDF are omitted.
 */
export function PrivacyPolicyBody() {
  return (
    <div className="space-y-4 text-[#414651] text-sm" style={fontStyle}>
      <p className="text-[#6B7280]">Last Modified: March 29, 2026.</p>
      <p>
        This Privacy Policy explains how Deposit Guard (&quot;Deposit Guard&quot;, &quot;we&quot;, &quot;us&quot;,
        &quot;our&quot;) collects, uses, stores, and shares your personal data when you use our website and mobile web
        application (the &quot;Service&quot;).
      </p>
      <p>
        Deposit Guard is designed for UK renters to create timestamped photo-based condition reports that help protect
        their tenancy deposits from unfair deductions.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">1. Who we are and how to contact us</h3>
      <p>
        The data controller responsible for your personal data is Deposit Guard Ltd, 55 St Paul&apos;s Street, Leeds, LS1
        2TE, United Kingdom.
      </p>
      <p>
        If you have any questions about this Privacy Policy or how we handle your data, you can contact us.
      </p>
      <p>
        If we appoint a Data Protection Officer (DPO), we will update this Policy with their contact details.
      </p>
      <p>
        You also have the right to complain to your local data protection authority, which in the UK is the Information
        Commissioner&apos;s Office (ICO).
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">2. Who this policy applies to</h3>
      <p>This Privacy Policy applies to:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Visitors to our website, including depositguard.com.</li>
        <li>People who contact us for support or feedback.</li>
        <li>People who fill out our surveys.</li>
        <li>Users who create an account and use the Service to document properties and generate reports.</li>
      </ul>
      <p>
        Our Service is intended for adults who are renting property in the UK. It is not intended for children under 18.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">3. Personal data we collect</h3>
      <p>We aim to collect only the data we need to provide the Service effectively and securely.</p>
      <p className="font-semibold text-[#101827]">3.1 Data you provide to us</p>
      <p className="font-semibold text-[#101827]">Account data</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Name</li>
        <li>Phone number</li>
        <li>Email address</li>
        <li>Password (stored as a hashed value, never in plain text)</li>
      </ul>
      <p className="font-semibold text-[#101827]">Property and report data</p>
      <p>When you create a property record and condition report, we process:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Property address and descriptive details (e.g. flat/house, move-in date, notes)</li>
        <li>Room names and types (e.g. kitchen, bedroom, hallway, garden)</li>
        <li>
          Photos you capture through the in-app camera, including:
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Image files</li>
            <li>Time and date each photo was taken (EXIF/device timestamp)</li>
            <li>Server upload timestamp</li>
            <li>Your text notes/annotations about each photo</li>
          </ul>
        </li>
        <li>
          Generated PDF reports (which include your photos, notes, property details, timestamps and report metadata)
        </li>
      </ul>
      <p className="font-semibold text-[#101827]">Support and communication data</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Messages you send to our support team (email or in-app help)</li>
        <li>Any additional information you choose to share (e.g. screenshots, descriptions of issues)</li>
      </ul>

      <p className="font-semibold text-[#101827]">3.2 Data we collect automatically</p>
      <p>When you use the Service, we may automatically collect:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>IP address</li>
        <li>Device and browser information (type, version, operating system)</li>
        <li>Log data (pages visited, actions taken, dates/times, error messages)</li>
        <li>
          Basic analytics data (e.g. number of properties created, number of photos per report, performance metrics)
        </li>
      </ul>

      <p className="font-semibold text-[#101827]">3.3 Cookies and similar technologies</p>
      <p>We may use cookies and similar technologies to:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Keep you logged in</li>
        <li>Remember your preferences</li>
        <li>Measure how the Service is used and improve performance</li>
      </ul>
      <p>
        Where required by law (e.g. for non-essential analytics cookies), we will ask for your consent via a cookie banner
        and/or Cookie Policy. You can manage your cookie preferences through your browser settings and, where
        available, in our cookie banner.
      </p>

      <p className="font-semibold text-[#101827]">3.4 Special category data</p>
      <p>
        We do not intentionally collect special category data (such as data about your health, religion, or ethnicity).
        However, photos you capture inside a property could sometimes incidentally reveal sensitive information (e.g.
        documents or personal items in the background). We ask you not to photograph anything that reveals more personal
        information than necessary to document the condition of the property.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">4. Purposes and legal bases for processing</h3>
      <p>
        Under UK GDPR and EU GDPR, we must have a legal basis for using your data. We rely on the following:
      </p>
      <p className="font-semibold text-[#101827]">4.1 To provide the Service</p>
      <p>We process your data as necessary to:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Create and manage your account</li>
        <li>Allow you to define properties and rooms, capture photos and notes, and generate reports</li>
        <li>Store your reports and make them available in your dashboard</li>
        <li>Provide core functionality such as offline capture and background syncing</li>
      </ul>
      <p>Legal basis: Article 6(1)(b) – performance of a contract with you.</p>

      <p className="font-semibold text-[#101827]">4.2 To maintain security and prevent fraud</p>
      <p>We process certain data to:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Ensure photo timestamps are consistent and detect potential manipulation (e.g. server vs. device timestamp
          mismatch logging)
        </li>
        <li>Monitor and protect the Service against abuse, bugs and attacks</li>
        <li>Keep audit logs for technical and security purposes</li>
      </ul>
      <p>
        Legal basis: Article 6(1)(f) – our legitimate interest in maintaining a secure and trustworthy platform.
      </p>

      <p className="font-semibold text-[#101827]">4.3 To improve and monitor the Service</p>
      <p>We may use analytics to understand how the Service is used, for example:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Performance and reliability metrics</li>
        <li>Usage patterns (e.g. average photos per report, average report generation time)</li>
      </ul>
      <p>Legal basis:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Article 6(1)(f) – our legitimate interest in improving and optimising the Service; and</li>
        <li>
          Where required by ePrivacy/PECR (e.g. for non-essential cookies), your consent under Article 6(1)(a).
        </li>
      </ul>

      <p className="font-semibold text-[#101827]">4.4 To communicate with you</p>
      <p>We may send you:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Service messages about your account or reports (e.g. email verification, password reset, report completion)
        </li>
        <li>Important updates about security, privacy or terms</li>
        <li>Occasional reminders directly related to ensuring the accuracy of your report</li>
      </ul>
      <p>Legal basis:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Article 6(1)(b) – performance of the contract (essential service communications)</li>
        <li>
          Article 6(1)(f) – our legitimate interest in keeping users informed about important changes to the Service
        </li>
      </ul>
      <p>
        If we ever send direct marketing (e.g. news or offers unrelated to an ongoing tenancy report), we will do so only
        where permitted by law and will always provide an unsubscribe option.
      </p>

      <p className="font-semibold text-[#101827]">4.5 To comply with legal obligations</p>
      <p>We may process and retain certain data to comply with:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Applicable laws and regulations</li>
        <li>Requests from law enforcement or regulatory bodies, where lawful and appropriate</li>
        <li>Accounting, auditing and record-keeping requirements</li>
      </ul>
      <p>Legal basis: Article 6(1)(c) – compliance with a legal obligation.</p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">5. How we share your personal data</h3>
      <p>We do not sell your personal data.</p>
      <p>We may share your data with:</p>
      <p className="font-semibold text-[#101827]">5.1 Service providers (processors)</p>
      <p>We use trusted third-party providers to help us run the Service, for example:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Cloud hosting and storage (e.g. infrastructure providers where your data and images are securely stored)</li>
        <li>Email delivery services (for verification emails, password resets, notifications)</li>
        <li>Error monitoring and logging tools</li>
        <li>Analytics providers</li>
      </ul>
      <p>
        These providers act as processors and are only allowed to process your data on our instructions. We require them
        to protect your data and to comply with data protection laws.
      </p>
      <p className="font-semibold text-[#101827]">5.2 Professional advisers</p>
      <p>
        We may share data with lawyers, auditors, insurers or other professional advisers where necessary, for example in
        connection with legal claims or compliance.
      </p>
      <p className="font-semibold text-[#101827]">5.3 Legal and law enforcement</p>
      <p>We may disclose your data where we believe in good faith that it is necessary to:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Comply with a legal obligation or valid legal request</li>
        <li>Protect your vital interests or those of another person</li>
        <li>Establish, exercise or defend legal claims</li>
        <li>Prevent or detect crime or fraud</li>
      </ul>
      <p className="font-semibold text-[#101827]">5.4 Business transfers</p>
      <p>
        If Deposit Guard is involved in a merger, acquisition, restructuring or sale of assets, your data may be
        transferred as part of that transaction. We will ensure any new owner continues to respect this Privacy Policy or
        provides equivalent protections, and we will notify you where required by law.
      </p>
      <p className="font-semibold text-[#101827]">5.5 Sharing reports</p>
      <p>
        We do not automatically share your reports with landlords, agents or third parties. You control who you share
        your reports with (for example, sending a report to your landlord or deposit scheme).
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">6. International transfers</h3>
      <p>
        Our primary infrastructure is intended to be hosted in regions that support compliance with UK/EU data-residency
        requirements (for example, EU/UK data centres).
      </p>
      <p>
        If we transfer your personal data outside the UK and/or EEA (for example, to a service provider in another
        country), we will ensure appropriate safeguards are in place, such as:
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>An adequacy decision by the UK or European Commission, or</li>
        <li>
          Standard Contractual Clauses (SCCs), the UK International Data Transfer Agreement (IDTA), or similar approved
          mechanisms.
        </li>
      </ul>
      <p>You can contact us for more details about the safeguards we use for international transfers.</p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">7. Data retention – how long we keep your data</h3>
      <p>
        We keep your personal data only as long as reasonably necessary for the purposes described in this Policy,
        including for the establishment, exercise or defence of legal claims, or as required by law.
      </p>
      <p className="font-semibold text-[#101827]">7.1 Account and profile data</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>We keep your account data (e.g. email, hashed password) while your account is active.</li>
        <li>
          If you close your account, we will generally delete or anonymise your account data within a reasonable
          period, except where we need to retain some data for legal or regulatory purposes.
        </li>
      </ul>
      <p className="font-semibold text-[#101827]">7.2 Property data, photos and reports</p>
      <p>
        Your condition reports are a key part of the Service and may be needed as evidence in tenancy deposit disputes.
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Within the app, completed reports are locked and cannot be edited or regenerated, to preserve their integrity.
        </li>
        <li>
          We normally retain your reports while your account remains active so that you can access them whenever you need
          them (for example, when moving out or dealing with a dispute).
        </li>
        <li>
          If you request deletion of a report or your entire account, we will either delete or anonymise the relevant
          data, unless we have a compelling legitimate reason or legal obligation to retain certain information (for
          example, to defend legal claims or comply with law).
        </li>
      </ul>
      <p className="font-semibold text-[#101827]">7.3 Logs and analytics data</p>
      <p>
        Technical logs and analytics data are kept for limited periods that allow us to troubleshoot issues, improve the
        Service and maintain security. Where possible, analytics data is aggregated or anonymised so that it can no longer
        identify you.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">8. Security</h3>
      <p>We take security seriously and use appropriate technical and organisational measures to protect your data, including:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Encryption in transit (TLS) and at rest for key data stores</li>
        <li>Access controls and role-based permissions for staff</li>
        <li>Audit logging for privileged actions and admin access</li>
        <li>Regular monitoring of system performance and error rates</li>
        <li>Disaster recovery and backup procedures designed to protect against data loss</li>
      </ul>
      <p>
        No system is ever perfectly secure, but we work to maintain a high level of security and to quickly address
        issues when they arise. You are responsible for keeping your password confidential and for choosing a strong,
        unique password for your Deposit Guard account.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">9. Your rights</h3>
      <p>
        Depending on where you live (e.g. UK or EEA), you have several rights under data protection law. These include:
      </p>
      <ol className="list-decimal space-y-2 pl-5">
        <li>Right of access – You can ask for a copy of the personal data we hold about you.</li>
        <li>Right to rectification – You can ask us to correct inaccurate or incomplete data.</li>
        <li>
          Right to erasure – You can ask us to delete your personal data in certain circumstances (for example, where it is
          no longer needed or you withdraw consent and there is no other legal basis).
        </li>
        <li>Right to restrict processing – You can ask us to restrict how we use your data in certain circumstances.</li>
        <li>
          Right to data portability – You can ask for your data in a structured, commonly used, machine-readable format and
          have it transmitted to another controller, where technically feasible.
        </li>
        <li>Right to object – You can object to processing based on our legitimate interests or to direct marketing.</li>
        <li>
          Right to withdraw consent – Where we rely on your consent (e.g. for certain cookies or marketing), you can
          withdraw that consent at any time.
        </li>
        <li>Right to lodge a complaint – You can complain to your local data protection authority, including the ICO in the UK.</li>
      </ol>
      <p>
        To exercise any of these rights, please contact us. We may need to verify your identity before responding to your
        request.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">10. Children&apos;s privacy</h3>
      <p>
        Our Service is intended for adults who are renting property. We do not knowingly collect personal data from
        children under 18. If you believe a child under 18 has provided us with personal data, please contact us and we
        will take appropriate steps to delete such data.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">11. Third-party links</h3>
      <p>
        Our website or emails may contain links to third-party websites or services. These sites have their own privacy
        policies, and we are not responsible for their practices. We recommend you review those policies before providing
        any personal data to third parties.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">12. Changes to this Privacy Policy</h3>
      <p>
        We may update this Privacy Policy from time to time to reflect changes in our Service, legal requirements or other
        factors.
      </p>
      <p>When we make material changes, we will:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Update the &quot;Last updated&quot; date at the top of this page, and</li>
        <li>Take reasonable steps to inform you, for example via in-app messages or email.</li>
      </ul>
      <p>
        We encourage you to review this Policy periodically to stay informed about how we protect your data.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">13. Contact</h3>
      <p>
        If you have any questions about this Privacy Policy or how we use your personal data, please contact us.
      </p>
    </div>
  );
}
