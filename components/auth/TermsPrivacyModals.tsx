"use client";

const fontStyle = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };

export type TermsPrivacyModalsProps = {
  termsModalOpen: boolean;
  privacyModalOpen: boolean;
  onCloseTerms: () => void;
  onClosePrivacy: () => void;
};

/** Same in-app modals as the login/signup page (terms + privacy). */
export function TermsPrivacyModals({
  termsModalOpen,
  privacyModalOpen,
  onCloseTerms,
  onClosePrivacy,
}: TermsPrivacyModalsProps) {
  return (
    <>
      {termsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={onCloseTerms}
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-title"
        >
          <div
            className="w-full max-w-[420px] max-h-[80vh] flex flex-col bg-white rounded-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="terms-title" className="text-[#101827] font-semibold text-xl p-6 pb-0" style={fontStyle}>
              Terms &amp; Conditions
            </h2>
            <div className="p-6 overflow-y-auto flex-1 text-[#414651] text-sm" style={fontStyle}>
              These Terms &amp; Conditions are a placeholder and will be updated before launch. By using Deposit
              Guard, you agree to use the platform responsibly and in accordance with UK law.
            </div>
            <div className="p-6 pt-0">
              <button
                type="button"
                onClick={onCloseTerms}
                className="w-full py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[#101827] font-medium text-base hover:bg-gray-50 transition-colors"
                style={fontStyle}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {privacyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={onClosePrivacy}
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-title"
        >
          <div
            className="w-full max-w-[420px] max-h-[80vh] flex flex-col bg-white rounded-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="privacy-title" className="text-[#101827] font-semibold text-xl p-6 pb-0" style={fontStyle}>
              Privacy Policy
            </h2>
            <div className="p-6 overflow-y-auto flex-1 text-[#414651] text-sm space-y-4" style={fontStyle}>
              <p>
                This Privacy Policy explains how Deposit Guard (&quot;Deposit Guard&quot;, &quot;we&quot;,
                &quot;us&quot;, &quot;our&quot;) collects, uses, stores, and shares your personal data when you use
                our website and mobile web application (the &quot;Service&quot;).
              </p>
              <p>
                Deposit Guard is designed for UK renters to create timestamped photo-based condition reports that
                help protect their tenancy deposits from unfair deductions.
              </p>

              <h3 className="font-semibold text-[#101827] text-base">1. Who we are and how to contact us</h3>
              <p>
                The data controller responsible for your personal data is Deposit Guard Ltd, 55 St Paul&apos;s
                Street, Leeds, LS1 2TE, United Kingdom.
              </p>
              <p>
                If you have any questions about this Privacy Policy or how we handle your data, you can contact us.
                If we appoint a Data Protection Officer (DPO), we will update this Policy with their contact
                details. You also have the right to complain to your local data protection authority, which in the
                UK is the Information Commissioner&apos;s Office (ICO).
              </p>

              <h3 className="font-semibold text-[#101827] text-base">2. Who this policy applies to</h3>
              <p>
                This Privacy Policy applies to: visitors to our website, including depositguard.com; people who
                contact us for support or feedback; people who fill out our surveys; and users who create an
                account and use the Service to document properties and generate reports.
              </p>
              <p>
                Our Service is intended for adults who are renting property in the UK. It is not intended for
                children under 18.
              </p>

              <h3 className="font-semibold text-[#101827] text-base">3. Personal data we collect</h3>
              <p>We aim to collect only the data we need to provide the Service effectively and securely.</p>
              <p className="font-medium text-[#101827]">3.1 Data you provide to us</p>
              <p>
                <span className="font-medium">Account data:</span> Name, phone number, email address, and password
                (stored as a hashed value, never in plain text).
              </p>
              <p>
                <span className="font-medium">Property and report data:</span> When you create a property record and
                condition report, we process: property address and descriptive details (e.g. flat/house, move-in
                date, notes); room names and types (e.g. kitchen, bedroom, hallway, garden); photos you capture
                through the in-app camera, including image files, time and date each photo was taken (EXIF/device
                timestamp), server upload timestamp, and your text notes/annotations about each photo; and generated
                PDF reports (which include your photos, notes, property details, timestamps and report metadata).
              </p>
              <p>
                <span className="font-medium">Support and communication data:</span> Messages you send to our
                support team (email or in-app help) and any additional information you choose to share (e.g.
                screenshots, descriptions of issues).
              </p>
              <p className="font-medium text-[#101827]">3.2 Data we collect automatically</p>
              <p>
                When you use the Service, we may automatically collect: IP address; device and browser information
                (type, version, operating system); log data (pages visited, actions taken, dates/times, error
                messages); and basic analytics data (e.g. number of properties created, number of photos per report,
                performance metrics).
              </p>
              <p className="font-medium text-[#101827]">3.3 Cookies and similar technologies</p>
              <p>
                We may use cookies and similar technologies to keep you logged in, remember your preferences, and
                measure how the Service is used and improve performance. Where required by law, we will ask for your
                consent via a cookie banner. You can manage your cookie preferences through your browser settings.
              </p>
              <p className="font-medium text-[#101827]">3.4 Special category data</p>
              <p>
                We do not intentionally collect special category data (such as data about your health, religion, or
                ethnicity). However, photos you capture inside a property could sometimes incidentally reveal
                sensitive information. We ask you not to photograph anything that reveals more personal information
                than necessary to document the condition of the property.
              </p>

              <h3 className="font-semibold text-[#101827] text-base">4. Purposes and legal bases for processing</h3>
              <p className="font-medium text-[#101827]">4.1 To provide the Service</p>
              <p>
                We process your data as necessary to create and manage your account, allow you to define properties
                and rooms, capture photos and notes, and generate reports, store your reports and make them available
                in your dashboard, and provide core functionality such as offline capture and background syncing.
                Legal basis: Article 6(1)(b) – performance of a contract with you.
              </p>
              <p className="font-medium text-[#101827]">4.2 To maintain security and prevent fraud</p>
              <p>
                We process certain data to ensure photo timestamps are consistent and detect potential manipulation,
                monitor and protect the Service against abuse, bugs and attacks, and keep audit logs for technical
                and security purposes. Legal basis: Article 6(1)(f) – our legitimate interest in maintaining a secure
                and trustworthy platform.
              </p>
              <p className="font-medium text-[#101827]">4.3 To improve and monitor the Service</p>
              <p>
                We may use analytics to understand how the Service is used, for example performance and reliability
                metrics, and usage patterns (e.g. average photos per report, average report generation time). Legal
                basis: Article 6(1)(f) – our legitimate interest in improving and optimising the Service; and where
                required by ePrivacy/PECR, your consent under Article 6(1)(a).
              </p>
              <p className="font-medium text-[#101827]">4.4 To communicate with you</p>
              <p>
                We may send you service messages about your account or reports (e.g. email verification, password
                reset, report completion), important updates about security, privacy or terms, and occasional
                reminders directly related to ensuring the accuracy of your report. Legal basis: Article 6(1)(b) –
                performance of the contract and Article 6(1)(f) – our legitimate interest in keeping users informed.
                If we ever send direct marketing, we will always provide an unsubscribe option.
              </p>
              <p className="font-medium text-[#101827]">4.5 To comply with legal obligations</p>
              <p>
                We may process and retain certain data to comply with applicable laws and regulations, requests from
                law enforcement or regulatory bodies where lawful, and accounting, auditing and record-keeping
                requirements. Legal basis: Article 6(1)(c) – compliance with a legal obligation.
              </p>

              <h3 className="font-semibold text-[#101827] text-base">5. How we share your personal data</h3>
              <p>We do not sell your personal data.</p>
              <p className="font-medium text-[#101827]">5.1 Service providers (processors)</p>
              <p>
                We use trusted third-party providers to help us run the Service, including cloud hosting and storage,
                email delivery services, error monitoring and logging tools, and analytics providers. These providers
                act as processors and are only allowed to process your data on our instructions.
              </p>
              <p className="font-medium text-[#101827]">5.2 Professional advisers</p>
              <p>
                We may share data with lawyers, auditors, insurers or other professional advisers where necessary,
                for example in connection with legal claims or compliance.
              </p>
              <p className="font-medium text-[#101827]">5.3 Legal and law enforcement</p>
              <p>
                We may disclose your data where we believe in good faith that it is necessary to comply with a legal
                obligation or valid legal request, protect your vital interests or those of another person,
                establish, exercise or defend legal claims, or prevent or detect crime or fraud.
              </p>
              <p className="font-medium text-[#101827]">5.4 Business transfers</p>
              <p>
                If Deposit Guard is involved in a merger, acquisition, restructuring or sale of assets, your data
                may be transferred as part of that transaction. We will ensure any new owner continues to respect
                this Privacy Policy, and we will notify you where required by law.
              </p>
              <p className="font-medium text-[#101827]">5.5 Sharing reports</p>
              <p>
                We do not automatically share your reports with landlords, agents or third parties. You control who
                you share your reports with.
              </p>

              <h3 className="font-semibold text-[#101827] text-base">6. International transfers</h3>
              <p>
                Our primary infrastructure is intended to be hosted in regions that support compliance with UK/EU
                data-residency requirements. If we transfer your personal data outside the UK and/or EEA, we will
                ensure appropriate safeguards are in place, such as an adequacy decision by the UK or European
                Commission, or Standard Contractual Clauses (SCCs) or the UK International Data Transfer Agreement
                (IDTA). You can contact us for more details.
              </p>

              <h3 className="font-semibold text-[#101827] text-base">7. Data retention – how long we keep your data</h3>
              <p>
                We keep your personal data only as long as reasonably necessary for the purposes described in this
                Policy, including for the establishment, exercise or defence of legal claims, or as required by law.
              </p>
              <p className="font-medium text-[#101827]">7.1 Account and profile data</p>
              <p>
                We keep your account data while your account is active. If you close your account, we will generally
                delete or anonymise your account data within a reasonable period, except where we need to retain some
                data for legal or regulatory purposes.
              </p>
              <p className="font-medium text-[#101827]">7.2 Property data, photos and reports</p>
              <p>
                Your condition reports are a key part of the Service and may be needed as evidence in tenancy
                deposit disputes. Within the app, completed reports are locked and cannot be edited or regenerated,
                to preserve their integrity. We normally retain your reports while your account remains active. If
                you request deletion of a report or your entire account, we will delete or anonymise the relevant
                data, unless we have a compelling legitimate reason or legal obligation to retain certain information.
              </p>
              <p className="font-medium text-[#101827]">7.3 Logs and analytics data</p>
              <p>
                Technical logs and analytics data are kept for limited periods to allow us to troubleshoot issues,
                improve the Service and maintain security. Where possible, analytics data is aggregated or
                anonymised.
              </p>

              <h3 className="font-semibold text-[#101827] text-base">8. Security</h3>
              <p>
                We take security seriously and use appropriate technical and organisational measures to protect your
                data, including encryption in transit (TLS) and at rest for key data stores, access controls and
                role-based permissions for staff, audit logging for privileged actions and admin access, regular
                monitoring of system performance and error rates, and disaster recovery and backup procedures. You
                are responsible for keeping your password confidential and for choosing a strong, unique password.
              </p>

              <h3 className="font-semibold text-[#101827] text-base">9. Your rights</h3>
              <p>Depending on where you live (e.g. UK or EEA), you have several rights under data protection law:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Right of access – You can ask for a copy of the personal data we hold about you.</li>
                <li>Right to rectification – You can ask us to correct inaccurate or incomplete data.</li>
                <li>Right to erasure – You can ask us to delete your personal data in certain circumstances.</li>
                <li>Right to restrict processing – You can ask us to restrict how we use your data in certain circumstances.</li>
                <li>Right to data portability – You can ask for your data in a structured, machine-readable format.</li>
                <li>Right to object – You can object to processing based on our legitimate interests or to direct marketing.</li>
                <li>Right to withdraw consent – Where we rely on your consent, you can withdraw it at any time.</li>
                <li>Right to lodge a complaint – You can complain to your local data protection authority, including the ICO in the UK.</li>
              </ol>
              <p>To exercise any of these rights, please contact us. We may need to verify your identity before responding.</p>

              <h3 className="font-semibold text-[#101827] text-base">10. Children&apos;s privacy</h3>
              <p>
                Our Service is intended for adults who are renting property. We do not knowingly collect personal
                data from children under 18. If you believe a child under 18 has provided us with personal data,
                please contact us and we will take appropriate steps to delete such data.
              </p>

              <h3 className="font-semibold text-[#101827] text-base">11. Third-party links</h3>
              <p>
                Our website or emails may contain links to third-party websites or services. These sites have their
                own privacy policies, and we are not responsible for their practices. We recommend you review those
                policies before providing any personal data to third parties.
              </p>

              <h3 className="font-semibold text-[#101827] text-base">12. Changes to this Privacy Policy</h3>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our Service, legal
                requirements or other factors. When we make material changes, we will update the &quot;Last
                updated&quot; date at the top of this page and take reasonable steps to inform you, for example via
                in-app messages or email. We encourage you to review this Policy periodically.
              </p>

              <h3 className="font-semibold text-[#101827] text-base">13. Contact</h3>
              <p>If you have any questions about this Privacy Policy or how we use your personal data, please contact us.</p>
            </div>
            <div className="p-6 pt-0">
              <button
                type="button"
                onClick={onClosePrivacy}
                className="w-full py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-[#101827] font-medium text-base hover:bg-gray-50 transition-colors"
                style={fontStyle}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
