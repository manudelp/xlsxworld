import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | XLSX World",
  description: "Terms and conditions for using XLSX World tools and services.",
};

const LAST_UPDATED = "April 4, 2026";

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <h1 className="text-4xl font-semibold mb-4 text-foreground text-center">
        Terms of Service
      </h1>
      <p className="mb-10 text-lg leading-relaxed text-muted text-center">
        Last updated: {LAST_UPDATED}
      </p>

      <div className="space-y-8 text-base leading-relaxed text-muted">
        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            Acceptance
          </h2>
          <p>
            By using XLSX World, you agree to these terms. If you do not agree,
            please do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            Service Description
          </h2>
          <p>
            XLSX World provides free online tools to convert, merge, split, and
            inspect spreadsheet files (.xlsx and .csv), along with optional
            account-based features. We may modify, suspend, or discontinue any
            part of the service at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            Accounts and Security
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              You are responsible for activity performed under your account.
            </li>
            <li>
              You must keep credentials confidential and use strong security
              practices.
            </li>
            <li>
              We may suspend access to protect users, systems, or data
              integrity.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            Acceptable Use
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Maximum file upload size: 20 MB per file.</li>
            <li>The service may only be used for lawful purposes.</li>
            <li>
              You must not upload content you are not authorized to process.
            </li>
            <li>
              You must not abuse, overload, reverse engineer, or disrupt the
              platform.
            </li>
            <li>
              Automated or abusive usage may result in rate limiting or access
              restrictions.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            Your Files
          </h2>
          <p>
            You retain full ownership of any files you upload. We do not claim
            any rights over your content. Files are processed temporarily and
            deleted automatically after your task is complete.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            Intellectual Property
          </h2>
          <p>
            The XLSX World service, branding, software, and site content are
            protected by intellectual property laws. Except as explicitly
            permitted, you may not copy, distribute, or create derivative works
            from our platform content.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            Third-Party Services
          </h2>
          <p>
            Some functionality relies on third-party providers. Their services
            may be governed by additional terms and privacy practices outside
            our control.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            Disclaimer
          </h2>
          <p>
            The service is provided &quot;as is&quot; without warranties of any
            kind. We do not guarantee that the service will be uninterrupted,
            error-free, or that results will be accurate. Always keep backups of
            your original files.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            Limitation of Liability
          </h2>
          <p>
            XLSX World shall not be liable for any indirect, incidental, or
            consequential damages arising from the use of the service, including
            but not limited to data loss or corruption.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            Indemnification
          </h2>
          <p>
            You agree to defend and indemnify XLSX World from claims,
            liabilities, and expenses arising from your misuse of the service,
            violation of law, or infringement of third-party rights.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">
            Termination
          </h2>
          <p>
            We may suspend or terminate access at our discretion, especially in
            cases of abuse, legal non-compliance, or security risk.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">Contact</h2>
          <p>
            Questions about these terms can be sent through our{" "}
            <a href="/contact" className="text-primary hover:underline">
              contact form
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">Changes</h2>
          <p>
            We may update these terms from time to time. Continued use of the
            service after changes constitutes acceptance of the updated terms.
          </p>
        </section>
      </div>
    </main>
  );
}
