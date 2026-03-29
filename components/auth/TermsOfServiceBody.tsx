"use client";

const fontStyle = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };

/**
 * Terms of Service text from Deposit Guard ToS (Last Modified: March 29, 2026).
 * Pagination/footer lines from the source PDF are omitted.
 */
export function TermsOfServiceBody() {
  return (
    <div className="space-y-4 text-[#414651] text-sm" style={fontStyle}>
      <p className="text-[#6B7280]">Last Modified: March 29, 2026.</p>
      <p>
        Please read these Terms of Service carefully before using Deposit Guard. By creating an account or using any
        part of the Service, you agree to be bound by these Terms. If you do not agree, you must not use the Service.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">1. Introduction and Acceptance of Terms</h3>
      <p>
        These Terms of Service (&quot;Terms&quot;) form a legally binding agreement between you (&quot;User&quot;,
        &quot;you&quot;, or &quot;your&quot;) and Deposit Guard Ltd (&quot;Deposit Guard&quot;, &quot;we&quot;,
        &quot;us&quot;, or &quot;our&quot;), a company incorporated in England and Wales. These Terms govern your
        access to and use of the Deposit Guard web application, related mobile experiences, and any associated services
        (collectively, the &quot;Service&quot;).
      </p>
      <p>By accessing or using the Service, you confirm that:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>You are at least 18 years of age;</li>
        <li>You have the legal capacity to enter into a binding contract;</li>
        <li>
          You are accessing the Service from the United Kingdom or, where applicable, from a jurisdiction in which the
          Service is lawfully available; and
        </li>
        <li>
          You have read, understood, and agree to be bound by these Terms and our Privacy Policy, which is incorporated
          herein by reference.
        </li>
      </ul>
      <p>
        If you are using the Service on behalf of an organisation, you represent and warrant that you have authority to
        bind that organisation to these Terms, and the word &quot;you&quot; includes both you personally and that
        organisation.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">2. Description of the Service</h3>
      <p>
        Deposit Guard is a mobile-first web application designed to assist UK-based residential tenants in documenting
        the condition of their rental property at or around the time of move-in. The Service enables Users to:
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Create a digital record of one or more rental properties;</li>
        <li>Define and manage the rooms within a property;</li>
        <li>
          Capture photographs of each room directly via their device camera from within the application;
        </li>
        <li>Add descriptive notes or annotations to individual photographs;</li>
        <li>
          Generate a timestamped condition report compiled from their photographs and notes (the &quot;Report&quot;);
        </li>
        <li>Store and download completed Reports for future reference.</li>
      </ul>
      <p>
        Deposit Guard is intended as an evidence-gathering and organisational tool. It is not a legal service, and
        nothing in the Service or any Report generated constitutes legal advice. We strongly recommend that you obtain
        independent legal advice if you intend to use a Report beyond dispute resolution proceedings offered by the
        government-backed deposit protection schemes.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">3. Account Registration and Security</h3>
      <p className="font-semibold text-[#101827]">3.1 Registration</p>
      <p>
        To use the Service, you must register for an account by providing a valid email address and a password meeting
        our minimum security requirements. You agree to provide accurate, current, and complete information during
        registration and to keep your account information updated.
      </p>
      <p className="font-semibold text-[#101827]">3.2 Account Security</p>
      <p>
        You are solely responsible for maintaining the confidentiality of your login credentials. You agree to:
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Choose a strong, unique password;</li>
        <li>Not share your password with any third party;</li>
        <li>
          Notify us immediately if you become aware of any unauthorised access to or use of your account; and
        </li>
        <li>
          Log out of your account at the end of each session, particularly when using shared or public devices.
        </li>
      </ul>
      <p>
        We will not be liable for any loss or damage arising from your failure to comply with the above security
        obligations.
      </p>
      <p className="font-semibold text-[#101827]">3.3 Account Suspension and Termination</p>
      <p>
        We reserve the right to suspend or terminate your account at our sole discretion if we have reason to believe you
        have violated these Terms, engaged in fraudulent activity, or caused harm to other Users or to Deposit Guard.
        We will endeavour to provide reasonable notice unless immediate action is required to protect the integrity of
        the Service.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">4. Acceptable Use Policy</h3>
      <p className="font-semibold text-[#101827]">4.1 Permitted Use</p>
      <p>
        The Service is provided exclusively for your personal, non-commercial use as a residential tenant for the purpose
        of documenting and evidencing the condition of your rental property.
      </p>
      <p className="font-semibold text-[#101827]">4.2 Prohibited Conduct</p>
      <p>You must not use the Service to:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Upload, capture, or submit photographs or content that is obscene, defamatory, discriminatory, or otherwise
          unlawful;
        </li>
        <li>Attempt to document a property you do not have a lawful right to access;</li>
        <li>
          Misrepresent the condition of a property, including by attempting to submit photographs taken at a different
          time or place than stated;
        </li>
        <li>
          Reverse-engineer, decompile, disassemble, or otherwise attempt to derive the source code of the Service;
        </li>
        <li>
          Use automated tools, bots, scrapers, or scripts to access the Service in any manner not expressly permitted;
        </li>
        <li>Circumvent, disable, or otherwise interfere with any security feature of the Service;</li>
        <li>
          Use the Service for any commercial purpose, including resale, sublicensing, or providing competing services;
        </li>
        <li>
          Upload content containing viruses, malware, or any code designed to disrupt, damage, or interfere with the
          Service;
        </li>
        <li>Impersonate any person or entity, or falsely represent your affiliation with any person or entity; or</li>
        <li>Use the Service in any manner that could give rise to civil or criminal liability.</li>
      </ul>
      <p className="font-semibold text-[#101827]">4.3 Photo Capture Requirements</p>
      <p>
        A core integrity requirement of the Service is that all photographs must be captured directly within the Deposit
        Guard application using your device&apos;s camera at the time of documentation. You must not:
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Upload photographs from your device&apos;s gallery or camera roll;</li>
        <li>Submit photographs captured on a previous occasion as if they were taken at move-in;</li>
        <li>Digitally alter or manipulate photographs in any way before or after capture.</li>
      </ul>
      <p>
        We implement technical controls to enforce direct camera capture, and we reserve the right to flag or remove
        Reports where evidence suggests these requirements have not been met.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">5. Reports, Content, and Immutability</h3>
      <p className="font-semibold text-[#101827]">5.1 Your Content</p>
      <p>
        You retain ownership of the photographs, notes, and other content you submit through the Service (&quot;Your
        Content&quot;). By submitting content, you grant Deposit Guard a non-exclusive, royalty-free, worldwide
        licence to store, process, display, and transmit Your Content solely for the purpose of providing the Service to
        you.
      </p>
      <p className="font-semibold text-[#101827]">5.2 Report Generation</p>
      <p>
        Once you initiate Report generation, the Service will compile Your Content into a Report. You acknowledge that:
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>You must ensure all rooms are documented and marked complete before generating a Report;</li>
        <li>
          You are responsible for the accuracy and completeness of the information and photographs included in the
          Report;
        </li>
        <li>Report generation may take several minutes depending on the number of photographs included.</li>
      </ul>
      <p className="font-semibold text-[#101827]">5.3 Report Immutability</p>
      <p>Once a Report has been generated and marked as completed, it becomes immutable. This means:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>No further photographs can be added to or deleted from the Report;</li>
        <li>Notes and annotations cannot be edited;</li>
        <li>The Report cannot be regenerated or replaced;</li>
        <li>The timestamp of Report generation is permanently recorded and cannot be altered.</li>
      </ul>
      <p>
        This immutability is a deliberate and essential feature of Deposit Guard, designed to preserve the evidential
        integrity of the Report. You should satisfy yourself that your documentation is thorough before generating the
        Report.
      </p>
      <p className="font-semibold text-[#101827]">5.4 Incomplete Reports</p>
      <p>
        Reports that remain in an &quot;in progress&quot; state without being completed may be automatically expired and
        subsequently deleted in accordance with the retention periods set out in our Privacy Policy. We will endeavour to
        provide notification before deletion occurs.
      </p>
      <p className="font-semibold text-[#101827]">5.5 Report Storage</p>
      <p>
        Completed Reports are stored in your account and are accessible for download at any time your account is active.
        You are strongly advised to download and independently store copies of your Reports. We cannot guarantee
        indefinite storage, particularly in the event of account closure or service discontinuation.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">6. Timestamps, Metadata, and Evidential Integrity</h3>
      <p className="font-semibold text-[#101827]">6.1 Timestamp Recording</p>
      <p>
        The Service records a server-side timestamp at the moment each photograph is uploaded. This timestamp reflects
        the date and time at which the photograph was received by our servers, and is recorded in Coordinated Universal
        Time (UTC) unless otherwise indicated.
      </p>
      <p className="font-semibold text-[#101827]">6.2 Metadata</p>
      <p>
        The Service may also capture and store metadata associated with your photographs, including but not limited to
        image resolution, file size, device timestamp extracted from EXIF data, and upload timestamp. This metadata is
        used to support the integrity of your Report.
      </p>
      <p className="font-semibold text-[#101827]">6.3 No Guarantee of Legal Admissibility</p>
      <p>
        While Deposit Guard is designed to generate documentation that may support a tenant in a deposit dispute, we
        make no representation or warranty that any Report or photograph will be accepted as evidence in any court,
        tribunal, or alternative dispute resolution process, including disputes administered by government-approved
        tenancy deposit schemes such as the Tenancy Deposit Scheme (TDS), mydeposits, or the Deposit Protection Service
        (DPS). The weight given to any Report will be at the discretion of the relevant decision-maker.
      </p>
      <p>
        Deposit Guard accepts no liability for any tenancy deposit or portion thereof that is awarded to a landlord,
        letting agent, or any other party, whether through a deposit protection scheme, court, tribunal, or any other
        dispute resolution process. We do not guarantee any particular outcome in a deposit dispute, and we will not
        reimburse, compensate, or otherwise cover any deposit funds lost or deducted, regardless of whether our Service
        was used to document the property&apos;s condition.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">7. Fees and Payment</h3>
      <p className="font-semibold text-[#101827]">7.1 Current Pricing</p>
      <p>
        Details of current pricing, including any free tier allowances, pay-per-use charges, or subscription options, are
        set out on our website at depositguard.com/pricing. We reserve the right to amend our pricing at any time,
        subject to the notice provisions in these Terms.
      </p>
      <p className="font-semibold text-[#101827]">7.2 Payment Processing</p>
      <p>
        All payments are processed by our third-party payment provider. By making a payment, you agree to provide
        accurate and current billing information and to promptly update that information in the event of any change. We
        do not store full payment card details.
      </p>
      <p className="font-semibold text-[#101827]">7.3 Taxes</p>
      <p>
        All fees are stated inclusive of VAT where applicable. You are responsible for any other taxes or duties that
        may apply to your use of the Service in your jurisdiction.
      </p>
      <p className="font-semibold text-[#101827]">7.4 Refunds</p>
      <p>
        Unless required by applicable law, fees paid are non-refundable. If you believe you have been charged in error,
        please contact us at support@depositguard.com within 14 days of the relevant charge.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">8. Intellectual Property</h3>
      <p className="font-semibold text-[#101827]">8.1 Deposit Guard IP</p>
      <p>
        The Service, including all software, design, text, graphics, logos, trademarks, and other materials (excluding
        Your Content), is owned by or licensed to Deposit Guard and is protected by applicable intellectual property
        laws. You are granted a limited, non-exclusive, non-transferable, revocable licence to access and use the Service
        for the purposes set out in these Terms. No other rights are granted.
      </p>
      <p className="font-semibold text-[#101827]">8.2 Restrictions</p>
      <p>
        You must not copy, reproduce, distribute, modify, create derivative works of, publicly display, or exploit any
        part of the Service or its content without our prior written consent.
      </p>
      <p className="font-semibold text-[#101827]">8.3 Feedback</p>
      <p>
        If you submit feedback, suggestions, or ideas regarding the Service, you grant us a perpetual, irrevocable,
        royalty-free licence to use that feedback for any purpose without obligation to you.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">9. Privacy and Data Protection</h3>
      <p>
        Your use of the Service is subject to our Privacy Policy, which explains how we collect, use, store, and share
        your personal data. Our Privacy Policy forms part of these Terms. By using the Service, you consent to the data
        practices described in the Privacy Policy.
      </p>
      <p>
        We process personal data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data
        Protection Act 2018. As a data controller, we are responsible for ensuring that your data is handled lawfully,
        fairly, and transparently.
      </p>
      <p>In particular, you should be aware that:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          Photographs you capture may contain personal data, including images of individuals. You are responsible for
          ensuring you have any necessary consents from third parties who may appear in your photographs before
          submitting them through the Service;
        </li>
        <li>
          We use third-party infrastructure providers, including cloud storage and authentication services, who act as
          data processors on our behalf; and
        </li>
        <li>
          You have rights under UK GDPR including the right to access, rectify, erase, and port your personal data,
          subject to applicable exemptions.
        </li>
      </ul>
      <p>To exercise your data subject rights, please contact us at support@depositguard.com.</p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">10. Third-Party Services and Links</h3>
      <p>
        The Service may integrate with or link to third-party services, including cloud storage providers, payment
        processors, and mapping or address-lookup services. These third parties are subject to their own terms of
        service and privacy policies, and we are not responsible for their practices or content. Your use of any
        third-party service is at your own risk.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">11. Disclaimers and Limitation of Liability</h3>
      <p className="font-semibold text-[#101827]">11.1 Service Provided &quot;As Is&quot;</p>
      <p>
        The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind,
        whether express, implied, or statutory, including but not limited to warranties of merchantability, fitness for
        a particular purpose, accuracy, or non-infringement, to the fullest extent permitted by applicable law.
      </p>
      <p className="font-semibold text-[#101827]">11.2 No Legal Advice</p>
      <p>
        Deposit Guard is a documentation tool, not a legal service. Nothing in the Service, in any Report generated, or
        in any communication from Deposit Guard constitutes legal advice. You should seek independent legal advice
        before using a Report in any formal dispute process.
      </p>
      <p className="font-semibold text-[#101827]">11.3 Limitation of Liability</p>
      <p>
        To the fullest extent permitted by law, Deposit Guard and its officers, directors, employees, agents, and
        licensors shall not be liable for any indirect, incidental, special, consequential, or punitive damages,
        including loss of profits, data, goodwill, or deposit recovery, arising from or in connection with your use of
        the Service, even if we have been advised of the possibility of such damages.
      </p>
      <p>
        Our total aggregate liability to you for any claim arising out of or related to these Terms or the Service shall
        not exceed the total fees paid by you to Deposit Guard in the 12 months preceding the event giving rise to the
        claim, or £50 (fifty pounds sterling), whichever is greater.
      </p>
      <p className="font-semibold text-[#101827]">11.4 Exceptions</p>
      <p>Nothing in these Terms shall limit or exclude our liability for:</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Death or personal injury caused by our negligence;</li>
        <li>Fraud or fraudulent misrepresentation;</li>
        <li>Any other liability that cannot be excluded or limited by law.</li>
      </ul>

      <h3 className="font-semibold text-[#101827] text-base pt-1">12. Indemnification</h3>
      <p>
        You agree to indemnify, defend, and hold harmless Deposit Guard and its officers, directors, employees, agents,
        and licensors from and against any claims, liabilities, damages, losses, costs, and expenses (including
        reasonable legal fees) arising out of or relating to:
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Your use of or inability to use the Service;</li>
        <li>Your breach of these Terms;</li>
        <li>Your violation of any applicable law or regulation;</li>
        <li>
          Your Content, including any infringement of third-party intellectual property or privacy rights; or
        </li>
        <li>
          Any dispute between you and a third party (including a landlord or deposit scheme) in connection with
          documentation you have created using the Service.
        </li>
      </ul>

      <h3 className="font-semibold text-[#101827] text-base pt-1">13. Modifications to These Terms</h3>
      <p>
        We reserve the right to modify these Terms at any time. If we make material changes, we will notify you by email
        to the address associated with your account or by displaying a prominent notice within the Service at least 14
        days before the changes take effect.
      </p>
      <p>
        Your continued use of the Service after the effective date of any changes constitutes your acceptance of the
        updated Terms. If you do not agree to the updated Terms, you must stop using the Service and may request
        account deletion in accordance with our Privacy Policy.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">14. Modifications to the Service</h3>
      <p>
        We reserve the right to modify, suspend, or discontinue the Service (or any part of it) at any time with or
        without notice, including for maintenance, upgrades, or business reasons. We will endeavour to provide
        reasonable advance notice of any planned discontinuation. We shall not be liable to you or any third party for
        any modification, suspension, or discontinuation of the Service.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">15. Termination</h3>
      <p className="font-semibold text-[#101827]">15.1 Termination by You</p>
      <p>
        You may close your account at any time by using the account deletion functionality within the Service settings
        or by contacting us at support@depositguard.io. Upon account closure, your personal data will be handled in
        accordance with our Privacy Policy.
      </p>
      <p className="font-semibold text-[#101827]">15.2 Termination by Us</p>
      <p>
        We may suspend or terminate your access to the Service immediately and without prior notice if we determine, in
        our sole discretion, that:
      </p>
      <ul className="list-disc space-y-2 pl-5">
        <li>You have breached any provision of these Terms;</li>
        <li>
          Your use of the Service poses a risk to other Users, to Deposit Guard, or to third parties; or
        </li>
        <li>We are required to do so by law or a regulatory authority.</li>
      </ul>
      <p className="font-semibold text-[#101827]">15.3 Effect of Termination</p>
      <p>
        Upon termination of your account, your right to access the Service will cease immediately. You should ensure you
        have downloaded all Reports and data you wish to retain before termination, as we may delete your data in
        accordance with our Privacy Policy following account closure.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">16. Governing Law and Dispute Resolution</h3>
      <p className="font-semibold text-[#101827]">16.1 Governing Law</p>
      <p>
        These Terms are governed by and construed in accordance with the laws of England and Wales, without regard to
        conflicts of law principles.
      </p>
      <p className="font-semibold text-[#101827]">16.2 Jurisdiction</p>
      <p>
        Any dispute arising out of or in connection with these Terms or the Service shall be subject to the exclusive
        jurisdiction of the courts of England and Wales, except that if you are a consumer resident in Scotland or
        Northern Ireland, you may also bring proceedings in the courts of your home jurisdiction.
      </p>
      <p className="font-semibold text-[#101827]">16.3 Alternative Dispute Resolution</p>
      <p>
        We are committed to resolving disputes fairly and efficiently. Before commencing formal proceedings, you agree to
        contact us at support@depositguard.io to attempt to resolve the dispute informally. We will endeavour to respond
        within 14 business days.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">17. General Provisions</h3>
      <p className="font-semibold text-[#101827]">17.1 Entire Agreement</p>
      <p>
        These Terms, together with our Privacy Policy and any other policies or guidelines incorporated by reference,
        constitute the entire agreement between you and Deposit Guard with respect to the Service and supersede all
        prior agreements, representations, and understandings.
      </p>
      <p className="font-semibold text-[#101827]">17.2 Severability</p>
      <p>
        If any provision of these Terms is found to be invalid, unlawful, or unenforceable, that provision shall be
        limited or eliminated to the minimum extent necessary, and the remaining provisions shall continue in full
        force and effect.
      </p>
      <p className="font-semibold text-[#101827]">17.3 Waiver</p>
      <p>
        Our failure to enforce any right or provision of these Terms shall not constitute a waiver of that right or
        provision. Any waiver must be in writing and signed by an authorised representative of Deposit Guard.
      </p>
      <p className="font-semibold text-[#101827]">17.4 Assignment</p>
      <p>
        You may not assign or transfer your rights or obligations under these Terms without our prior written consent. We
        may assign our rights and obligations without restriction, including in connection with a merger, acquisition, or
        sale of assets.
      </p>
      <p className="font-semibold text-[#101827]">17.5 Force Majeure</p>
      <p>
        We shall not be liable for any failure or delay in performance of our obligations under these Terms caused by
        events beyond our reasonable control, including acts of God, natural disasters, pandemic, government
        restrictions, or failures of third-party infrastructure providers.
      </p>
      <p className="font-semibold text-[#101827]">17.6 Consumer Rights</p>
      <p>
        If you are a consumer as defined under the Consumer Rights Act 2015, nothing in these Terms affects your
        statutory rights. Where any provision of these Terms conflicts with your statutory rights, your statutory rights
        shall prevail.
      </p>

      <h3 className="font-semibold text-[#101827] text-base pt-1">18. Contact Information</h3>
      <p>
        If you have any questions, concerns, or complaints regarding these Terms or the Service, please contact us at:
      </p>
      <p>
        Deposit Guard Ltd
        <br />
        55 St Paul&apos;s Street, Leeds, LS1 2TE, United Kingdom
        <br />
        Email: support@depositguard.com
        <br />
        Website: depositguard.com
      </p>
      <p>We aim to respond to all enquiries within 5 business days.</p>
    </div>
  );
}
