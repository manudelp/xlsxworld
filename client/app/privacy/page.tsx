import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | XLSX World",
  description: "Learn how XLSX World handles your data, files, and privacy.",
};

const LAST_UPDATED = "April 4, 2026";

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <h1 className="text-4xl font-semibold mb-4 text-foreground text-center">
        Privacy Policy
      </h1>
      <p className="mb-10 text-lg leading-relaxed text-muted text-center">
        Last updated: {LAST_UPDATED}
      </p>

      <div className="space-y-8 text-base leading-relaxed text-muted">
        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">Scope</h2>
          <p>
            This Privacy Policy explains how XLSX World collects, uses, stores,
            and protects personal information when you use our website, account
            features, and spreadsheet tools.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            Information We Collect
          </h2>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>
              Account data, such as email address and optional profile details.
            </li>
            <li>Support data you submit through the contact form.</li>
            <li>
              Operational metadata, including request timestamps, route usage,
              and basic diagnostic events.
            </li>
            <li>
              Security and abuse-prevention data, such as IP address and
              rate-limit signals.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            File Processing
          </h2>
          <p>
            Files you upload are processed temporarily on our servers solely to
            perform the requested operation (convert, merge, split, inspect,
            etc.). Files are automatically deleted shortly after processing is
            complete. We do not read, inspect, sell, or share the contents of
            your files.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            How We Use Information
          </h2>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>To provide and secure core product functionality.</li>
            <li>To authenticate sessions and maintain account access.</li>
            <li>
              To measure reliability and performance of endpoints and tools.
            </li>
            <li>To respond to support requests and enforce acceptable use.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            Cookies and Session Storage
          </h2>
          <p>
            We use essential cookies and secure session mechanisms required for
            authentication, request continuity, and abuse prevention. We do not
            use advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            Data Sharing
          </h2>
          <p>
            We do not sell your personal data. We may share limited information
            with service providers that help us operate the platform (for
            example, hosting, authentication, and abuse protection), subject to
            appropriate contractual safeguards.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            Third-Party Services
          </h2>
          <p>
            We use third-party services to deliver core product features,
            including CAPTCHA, hosting infrastructure, and authentication.
            Please refer to{" "}
            <a
              href="https://www.cloudflare.com/privacypolicy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Cloudflare&apos;s Privacy Policy
            </a>{" "}
            and other provider terms for details on their data handling.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            Data Retention
          </h2>
          <p>
            We retain data only for as long as needed to provide the service,
            comply with legal obligations, resolve disputes, and enforce our
            agreements. Temporary processing artifacts are routinely deleted.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            Your Rights and Choices
          </h2>
          <p>
            You may contact us at any time to request deletion of any personal
            data we may hold, subject to legal and security requirements. Use
            our{" "}
            <a href="/contact" className="text-primary hover:underline">
              contact form
            </a>{" "}
            to submit privacy requests.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">Security</h2>
          <p>
            We apply technical and organizational safeguards designed to protect
            your information, but no system is completely secure. You are
            responsible for safeguarding your account credentials.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">Changes</h2>
          <p>
            We may update this policy from time to time. Changes will be
            reflected on this page with an updated date.
          </p>
        </section>
      </div>
    </main>
  );
}
