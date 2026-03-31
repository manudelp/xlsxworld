import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | XLSX World",
  description: "Terms and conditions for using XLSX World tools and services.",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <h1 className="text-4xl font-semibold mb-4 text-foreground text-center">
        Terms of Service
      </h1>
      <p className="mb-10 text-lg leading-relaxed text-muted text-center">
        Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
      </p>

      <div className="space-y-8 text-base leading-relaxed text-muted">
        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">Acceptance</h2>
          <p>
            By using XLSX World, you agree to these terms. If you do not agree,
            please do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">Service Description</h2>
          <p>
            XLSX World provides free online tools to convert, merge, split, and
            inspect spreadsheet files (.xlsx and .csv). We reserve the right to
            modify, suspend, or discontinue any part of the service at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">Usage Limits</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Maximum file upload size: 20 MB per file.</li>
            <li>The service is intended for lawful, personal, and commercial use.</li>
            <li>Automated or abusive usage may result in rate limiting or access restrictions.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">Your Files</h2>
          <p>
            You retain full ownership of any files you upload. We do not claim
            any rights over your content. Files are processed temporarily and
            deleted automatically after your task is complete.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">Disclaimer</h2>
          <p>
            The service is provided &quot;as is&quot; without warranties of any
            kind. We do not guarantee that the service will be uninterrupted,
            error-free, or that results will be accurate. Always keep backups of
            your original files.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-foreground mb-3">Limitation of Liability</h2>
          <p>
            XLSX World shall not be liable for any indirect, incidental, or
            consequential damages arising from the use of the service, including
            but not limited to data loss or corruption.
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
